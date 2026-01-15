import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, UIManager, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePermission } from '../../hooks/usePermission';
import api from '../../services/api';
import { BudgetCategory, Expense, ProjectBudget } from '../../types';

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Utilidades ---

// Función auxiliar para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Función para formatear el input de moneda (agrega comas mientras escribes)
const formatInputCurrency = (text: string) => {
  if (!text) return '';
  // Eliminar todo excepto números y punto
  let cleanVal = text.replace(/[^0-9.]/g, '');
  
  // Evitar múltiples puntos
  const parts = cleanVal.split('.');
  if (parts.length > 2) {
    cleanVal = parts[0] + '.' + parts.slice(1).join('');
  }

  const [integer, decimal] = cleanVal.split('.');
  const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  if (decimal !== undefined) {
    return `${formattedInt}.${decimal.slice(0, 2)}`;
  }
  return formattedInt;
};

// Generador de Datos Mock (Simulación de API)
const generateMockBudget = (projectId: string): ProjectBudget => {
  // Simulamos que la API devuelve solo las partidas activas para este proyecto
  // usando los nombres del catálogo (mockCategoriesCatalog)
  const categories = [
    { name: 'Cimentación', allocated: 40000, spent: 48000 }, // Ejemplo sobre presupuesto
    { name: 'Estructura', allocated: 120000, spent: 65000 },
    { name: 'Albañilería', allocated: 80000, spent: 25000 },
    { name: 'Instalaciones', allocated: 60000, spent: 12000 },
    { name: 'Acabados', allocated: 90000, spent: 0 },
  ];

  const totalBudget = categories.reduce((acc, cat) => acc + cat.allocated, 0);
  
  const expenses: Expense[] = [
    { id: '1', date: '2023-10-01', concept: 'Concreto premezclado', category: 'Cimentación', amount: 15000, attachment: true, attachmentId: 'mock-id-1' },
    { id: '2', date: '2023-10-05', concept: 'Varilla 3/8', category: 'Cimentación', amount: 8000, attachment: false, attachmentId: undefined },
    { id: '3', date: '2023-10-12', concept: 'Nómina sem 40', category: 'Albañilería', amount: 5000, attachment: true, attachmentId: 'mock-id-3' },
    { id: '4', date: '2023-10-15', concept: 'Vigas de acero', category: 'Estructura', amount: 45000, attachment: true, attachmentId: 'mock-id-4' },
    { id: '5', date: '2023-10-18', concept: 'Tubería PVC', category: 'Instalaciones', amount: 2500, attachment: false, attachmentId: undefined },
  ];

  return {
    projectId,
    totalBudget,
    categories,
    expenses,
  };
};

// --- Mock Catalog Data (Simulando colección de Mongo) ---
// const mockCategoriesCatalog = [
//   { id: 'cat1', name: 'Cimentación' },
//   { id: 'cat2', name: 'Estructura' },
//   { id: 'cat3', name: 'Albañilería' },
//   { id: 'cat4', name: 'Instalaciones' },
//   { id: 'cat5', name: 'Acabados' },
//   { id: 'cat6', name: 'Carpintería' },
//   { id: 'cat7', name: 'Herrería' },
// ];

// --- Componentes Internos ---

const BudgetCards = ({ budget, spent }: { budget: number, spent: number }) => {
  const balance = budget - spent;
  const isPositive = balance >= 0;

  return (
    <View style={styles.cardsContainer}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{i18n.t('budgets.totalBudget')}</Text>
        <Text style={styles.cardValue}>{formatCurrency(budget)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{i18n.t('budgets.totalExpenses')}</Text>
        <Text style={styles.cardValue}>{formatCurrency(spent)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{i18n.t('budgets.balance')}</Text>
        <Text style={[styles.cardValue, { color: isPositive ? '#38A169' : '#E53E3E' }]}>
          {formatCurrency(balance)}
        </Text>
      </View>
    </View>
  );
};

const BudgetBarChart = ({ categories }: { categories: BudgetCategory[] }) => {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const maxValue = Math.max(...categories.map(c => Math.max(c.allocated, c.spent)), 1);
  const chartHeight = 120;
  const { theme } = useTheme();

  // --- Lógica Responsiva ---
  // Ancho total disponible para la gráfica (restando paddings)
  const chartVisibleWidth = windowWidth - 64; // 32 de padding a cada lado
  const numberOfBars = categories.length;
  const barGroupWidth = Math.max(60, chartVisibleWidth / numberOfBars); // Ancho por grupo de barras
  const barWidth = Math.max(8, barGroupWidth * 0.2); // Ancho de cada barra individual

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{i18n.t('budgets.chartComparison')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, paddingTop: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 50, paddingLeft: 10 }}>
          {categories.map((cat, index) => {
            const allocatedHeight = Math.max((cat.allocated / maxValue) * chartHeight, 4);
            const spentHeight = Math.max((cat.spent / maxValue) * chartHeight, 4);
            const isOver = cat.spent > cat.allocated;
            const isSelected = selectedBarIndex === index;

            return (
              <Pressable 
                key={index} 
                style={{ alignItems: 'center', width: barGroupWidth }}
                onPress={() => setSelectedBarIndex(isSelected ? null : index)}
              >
                {/* Tooltip Flotante */}
                {isSelected && (
                  <View style={{ 
                    position: 'absolute', 
                    bottom: chartHeight + 10, 
                    backgroundColor: '#2D3748', 
                    padding: 8, 
                    borderRadius: 4, 
                    zIndex: 100,
                    minWidth: 100,
                    alignItems: 'center',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>{cat.name}</Text>
                    <Text style={{ color: '#CBD5E0', fontSize: 10 }}>{i18n.t('budgets.allocated')}: {formatCurrency(cat.allocated)}</Text>
                    <Text style={{ color: '#63B3ED', fontSize: 10 }}>{i18n.t('budgets.spent')}: {formatCurrency(cat.spent)}</Text>
                    {/* Flecha del Tooltip */}
                    <View style={{ position: 'absolute', bottom: -5, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2D3748' }} />
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, width: '100%', justifyContent: 'center' }}>
                  {/* Allocated Bar */}
                  <View style={{ width: barWidth, height: allocatedHeight, backgroundColor: '#CBD5E0', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginRight: 4, opacity: isSelected ? 1 : 0.8 }} />
                  {/* Spent Bar */}
                  <View style={{ width: barWidth, height: spentHeight, backgroundColor: isOver ? '#E53E3E' : theme.primaryColor, borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: isSelected ? 1 : 0.8 }} />
                </View>
                <Text style={{ fontSize: 10, color: isSelected ? '#2D3748' : '#718096', fontWeight: isSelected ? 'bold' : 'normal', marginTop: 8, textAlign: 'center' }} numberOfLines={2}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 12, height: 12, backgroundColor: '#CBD5E0', marginRight: 6, borderRadius: 3 }} />
          <Text style={{ fontSize: 12, color: '#718096' }}>{i18n.t('budgets.allocated')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 12, height: 12, backgroundColor: theme.primaryColor, marginRight: 6, borderRadius: 3 }} />
          <Text style={{ fontSize: 12, color: '#718096' }}>{i18n.t('budgets.spent')}</Text>
        </View>
      </View>
    </View>
  );
};

const CategoryProgress = ({ categories }: { categories: BudgetCategory[] }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{i18n.t('budgets.summaryByCategory')}</Text>
      {categories.map((cat, index) => {
        const isOverBudget = cat.spent > cat.allocated;
        const progress = Math.min(100, (cat.spent / cat.allocated) * 100);
        return (
          <View key={index} style={styles.progressRow}>
            <View style={styles.progressHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.categoryName, isOverBudget && { color: '#E53E3E' }]}>{cat.name}</Text>
                {isOverBudget && (
                  <View style={styles.overBudgetTag}>
                    <Text style={styles.overBudgetText}>{i18n.t('budgets.overBudget')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.categoryValues, isOverBudget && { color: '#E53E3E' }]}>
                {formatCurrency(cat.spent)} / {formatCurrency(cat.allocated)}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isOverBudget ? '#E53E3E' : theme.primaryColor }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const AttachmentViewerModal = ({ visible, attachmentId, onClose, token }: { visible: boolean, attachmentId: string | null, onClose: () => void, token: string | null }) => {
  const [content, setContent] = useState<{ uri: string, type: 'image' | 'pdf' | 'loading' | 'error' } | null>(null);
  const contentUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !attachmentId) {
      // Clean up previous blob URL if it exists
      if (contentUriRef.current && contentUriRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(contentUriRef.current);
        contentUriRef.current = null;
      }
      setContent(null);
      return;
    }

    const loadAttachment = async () => {
      setContent({ uri: '', type: 'loading' });

      try {
        const response = await api.get(`/api/files/${attachmentId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'blob'
        });

        const contentType = response.headers['content-type'] || '';
        const blob = response.data;
        const blobUrl = URL.createObjectURL(blob);
        contentUriRef.current = blobUrl; // Store for cleanup

        if (contentType.includes('application/pdf')) {
          setContent({ uri: blobUrl, type: 'pdf' });
        } else if (contentType.startsWith('image/')) {
          setContent({ uri: blobUrl, type: 'image' });
        } else {
          throw new Error('Unsupported file type');
        }
      } catch (e) {
        console.error("Error loading attachment for modal:", e);
        setContent({ uri: '', type: 'error' });
      }
    };

    loadAttachment();

  }, [visible, attachmentId, token]);

  const renderContent = () => {
    if (!content) return null;

    switch (content.type) {
      case 'loading':
        return <ActivityIndicator size="large" color="#FFF" />;
      case 'image':
        return <Image source={{ uri: content.uri }} style={styles.fullscreenImage} resizeMode="contain" />;
      case 'pdf':
        if (Platform.OS === 'web') {
          return <iframe src={content.uri} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />;
        } else {
          return <WebView source={{ uri: content.uri }} style={{ flex: 1, width: '100%' }} />;
        }
      case 'error':
        return <Text style={{ color: 'white' }}>{i18n.t('common.loadError')}</Text>;
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <Feather name="x" size={32} color="#FFFFFF" />
        </Pressable>
        <View style={styles.fullscreenContent}>{renderContent()}</View>
      </View>
    </Modal>
  );
};

const ExpenseHistory = ({ expenses, categories, onAddExpense, onEdit, onDelete, onViewAttachment, canUpdate, canDelete }: { expenses: Expense[], categories: BudgetCategory[], onAddExpense: () => void, onEdit: (expense: Expense) => void, onDelete: (id: string) => void, onViewAttachment: (attachmentId: string) => void, canUpdate?: boolean, canDelete?: boolean }) => {
  const [search, setSearch] = useState('');
  
  const filteredExpenses = expenses.filter(e => 
    e.concept.toLowerCase().includes(search.toLowerCase()) || 
    e.category.toLowerCase().includes(search.toLowerCase())
  );
  const { theme } = useTheme();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>{i18n.t('budgets.expenseHistory')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canUpdate && (
            <Pressable style={styles.addButton} onPress={onAddExpense}>
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.addButtonText}>{i18n.t('projectDetail.add')}</Text>
            </Pressable>
          )}
          <Pressable style={styles.exportButton} onPress={() => alert(i18n.t('budgets.exporting'))}>
            <Feather name="download" size={14} color="#FFF" />
            <Text style={styles.exportButtonText}>{i18n.t('common.export')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#A0AEC0" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder={i18n.t('budgets.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ minWidth: 600, width: '100%' }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerText]}>{i18n.t('common.date')}</Text>
            <Text style={[styles.colConcept, styles.headerText]}>{i18n.t('budgets.concept')}</Text>
            <Text style={[styles.colCategory, styles.headerText]}>{i18n.t('budgets.category')}</Text>
            <Text style={[styles.colAmount, styles.headerText]}>{i18n.t('budgets.amount')}</Text>
            <Text style={[styles.colAttachment, styles.headerText, { textAlign: 'center' }]}>{i18n.t('budgets.attachmentAbbr')}</Text>
            <Text style={[styles.colActions, styles.headerText]}></Text>
          </View>

          {filteredExpenses.map(item => {
            const category = categories.find(c => c.name === item.category);
            const isOverBudget = category ? category.spent > category.allocated : false;

            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colDate}>{item.date}</Text>
                <Text style={styles.colConcept}>{item.concept}</Text>
                <View style={styles.colCategory}>
                  <View style={styles.categoryTag}>
                    <Text style={[styles.categoryTagText, isOverBudget && { color: '#E53E3E' }]}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
                <View style={styles.colAttachment}>
                  {item.attachment && (
                    <Pressable style={styles.actionButton} onPress={() => item.attachmentId && onViewAttachment(item.attachmentId)}>
                      <Feather name="eye" size={16} color="#718096" />
                    </Pressable>
                  )}
                </View>
                <View style={styles.colActions}>
                  {canUpdate && (
                    <Pressable style={styles.actionButton} onPress={() => onEdit(item)}>
                      <Feather name="edit-2" size={16} color={theme.primaryColor} />
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable style={styles.actionButton} onPress={() => onDelete(item.id)}>
                      <Feather name="trash-2" size={16} color="#E53E3E" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const ProjectBudgetGroup = ({ 
  project, 
  onAddExpense, 
  extraExpenses = [], 
  customBudget,
  deletedExpenseIds = [],
  updatedExpenses = [],
  onDeleteExpense,
  onEditExpense,
  onViewAttachment,
  canUpdate,
  canDelete
}: { project: any, onAddExpense: () => void, extraExpenses?: Expense[], customBudget?: any, deletedExpenseIds?: string[], updatedExpenses?: Expense[], onDeleteExpense: (id: string) => void, onEditExpense: (expense: Expense) => void, onViewAttachment: (attachmentId: string) => void, canUpdate?: boolean, canDelete?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  
  // Usamos useMemo para que los datos mockeados no cambien en cada renderizado
  // Si existe un presupuesto personalizado (creado recientemente), lo usamos en lugar del mock
  const budgetData = useMemo(() => {
    if (customBudget) {
      // Si ya tiene la estructura completa (viene de la API o estado procesado)
      if (customBudget.totalBudget !== undefined) {
        return customBudget as ProjectBudget;
      }
      // Fallback para estructura antigua o parcial (si fuera necesario)
      return {
        projectId: project.id,
        totalBudget: customBudget.totalAmount,
        categories: customBudget.categories.map((c: any) => ({
          name: c.name,
          allocated: c.allocated,
          spent: 0
        })),
        expenses: []
      };
    }
    return generateMockBudget(project.id);
  }, [project.id, customBudget]);
  
  // Combinar gastos mockeados con los nuevos gastos agregados por el usuario
  const allExpenses = useMemo(() => {
    // 1. Combinar mock + nuevos
    let combined = [...extraExpenses, ...budgetData.expenses];
    
    // 2. Aplicar actualizaciones (si un gasto fue editado, reemplazarlo)
    combined = combined.map(exp => {
      const updated = updatedExpenses.find(u => u.id === exp.id);
      return updated || exp;
    });

    // 3. Filtrar eliminados
    return combined.filter(e => !deletedExpenseIds.includes(e.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [budgetData.expenses, extraExpenses, deletedExpenseIds, updatedExpenses]);

  // Recalcular el gasto por categoría incluyendo los nuevos gastos
  const categories = useMemo(() => {
    const newCats = budgetData.categories.map((c: any) => ({ ...c })); // Copia profunda para no mutar el original
    allExpenses.forEach(exp => {
      const cat = newCats.find((c: { name: string; }) => c.name === exp.category);
      // Nota: Aquí sumamos 'amount' de allExpenses. Como budgetData.categories ya trae 'spent' pre-calculado del mock,
      // deberíamos reiniciar 'spent' a 0 antes de sumar si queremos recalcular exacto, o asumir que el mock spent es solo de mock expenses.
      // Para simplificar y que funcione dinámicamente:
      if (cat) {
        // Reiniciamos el spent de la categoría base para recalcularlo con la lista filtrada/editada
        cat.spent = 0; 
      }
    });
    
    allExpenses.forEach(exp => {
       const cat = newCats.find((c: { name: string; }) => c.name === exp.category);
       if (cat) cat.spent += exp.amount;
    });

    return newCats;
  }, [budgetData.categories, allExpenses]);

  const totalSpent = categories.reduce((acc: any, cat: { spent: any; }) => acc + cat.spent, 0);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.projectGroup}>
      <Pressable onPress={toggleExpand} style={styles.groupHeader}>
        <Feather name={expanded ? "chevron-down" : "chevron-right"} size={20} color="#4A5568" />
        <Text style={styles.groupTitle}>{project.name}</Text>
        <View style={[styles.badge, { backgroundColor: expanded ? theme.primaryColor : '#E2E8F0' }]}>
          <Text style={[styles.badgeText, { color: expanded ? '#FFF' : '#4A5568' }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>
      </Pressable>
      
      {expanded && (
        <View style={styles.groupContent}>
          <BudgetCards budget={budgetData.totalBudget} spent={totalSpent} />
          <BudgetBarChart categories={categories} />
          <CategoryProgress categories={categories} />
          <ExpenseHistory 
            expenses={allExpenses} 
            categories={categories} 
            onAddExpense={onAddExpense} 
            onDelete={onDeleteExpense} 
            onEdit={onEditExpense} 
            onViewAttachment={onViewAttachment}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </View>
      )}
    </View>
  );
};

// --- Componente Modal para Agregar Gasto (Partida) ---
const AddExpenseModal = ({ visible, onClose, projects, initialProjectId, onSave, expenseToEdit, categories }: { visible: boolean, onClose: () => void, projects: any[], initialProjectId?: string | null, onSave: (data: any) => void, expenseToEdit?: (Expense & { projectId: string }) | null, categories: { id: string, name: string }[] }) => {
  const [projectId, setProjectId] = useState(initialProjectId || projects[0]?.id || '');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  const { theme } = useTheme();

  useEffect(() => {
    if (visible) {
      if (expenseToEdit) {
        setProjectId(expenseToEdit.projectId);
        setConcept(expenseToEdit.concept);
        setAmount(expenseToEdit.amount.toString());
        setCategory(expenseToEdit.category);
        setAttachmentUri(null);
      } else {
        setProjectId(initialProjectId || projects[0]?.id || '');
        setConcept('');
        setAmount('');
        setCategory('');
        setAttachmentUri(null);
      }
    }
  }, [visible, expenseToEdit, initialProjectId, projects]);

  const handleSave = () => {
    if (!concept || !amount || !category) {
      showAlert(i18n.t('common.error'), i18n.t('common.fillAllFields'));
      return;
    }

    onSave({
      id: expenseToEdit?.id,
      projectId,
      concept,
      amount: parseFloat(amount.replace(/,/g, '')),
      category,
      attachmentUri
    });
    onClose();
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      setAttachmentUri(result.assets[0].uri);
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{expenseToEdit ? i18n.t('budgets.editExpense') : i18n.t('budgets.addExpense')}</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>

          {!expenseToEdit && (
            <>
              <Text style={styles.inputLabel}>{i18n.t('common.project')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelectorContainer}>
                {projects.map(p => (
                  <Pressable key={p.id} onPress={() => setProjectId(p.id)} style={[styles.projectBadge, projectId === p.id && { backgroundColor: '#EBF8FF', borderColor: theme.primaryColor }]}>
                    <Text style={[styles.projectBadgeText, projectId === p.id && { color: theme.primaryColor, fontWeight: '600' }]}>{p.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.inputLabel}>{i18n.t('budgets.concept')}</Text>
          <TextInput style={styles.modalInput} value={concept} onChangeText={setConcept} placeholder="Ej. Cemento" />

          <Text style={styles.inputLabel}>{i18n.t('budgets.amount')}</Text>
          <TextInput 
            style={styles.modalInput} 
            value={amount} 
            onChangeText={(text) => setAmount(formatInputCurrency(text))} 
            keyboardType="decimal-pad" 
            placeholder="0.00" 
          />

          <Text style={styles.inputLabel}>{i18n.t('budgets.category')}</Text>
          <View style={{ zIndex: 10 }}>
            <Pressable style={[styles.modalInput, styles.selectButton]} onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}>
              <Text style={{ color: category ? '#2D3748' : '#A0AEC0' }}>{category || i18n.t('budgets.selectCategory')}</Text>
              <Feather name="chevron-down" size={20} color="#A0AEC0" />
            </Pressable>
            {showCategoryDropdown && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                  {categories.map((cat) => (
                    <Pressable 
                      key={cat.id} 
                      style={styles.dropdownItem} 
                      onPress={() => { setCategory(cat.name); setShowCategoryDropdown(false); }}
                    >
                      <Text style={styles.dropdownItemText}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>{i18n.t('budgets.receiptOptional')}</Text>
          {attachmentUri ? (
            <View style={styles.attachmentPreview}>
              <Feather name="file" size={20} color={theme.primaryColor} />
              <Text style={styles.attachmentText} numberOfLines={1}>{i18n.t('budgets.attachmentSelected')}</Text>
              <Pressable onPress={() => setAttachmentUri(null)}>
                <Feather name="x" size={20} color="#E53E3E" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.uploadButton} onPress={pickDocument}>
              <Feather name="upload" size={20} color="#4A5568" />
              <Text style={styles.uploadButtonText}>{i18n.t('common.upload')}</Text>
            </Pressable>
          )}

          <Pressable style={[styles.saveButton, { backgroundColor: theme.primaryColor }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{i18n.t('budgets.saveExpense')}</Text>
          </Pressable>
          <AlertComponent />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- Componente Modal para Crear Nuevo Presupuesto (Monto Total) ---
const CreateBudgetModal = ({ visible, onClose, projects, existingBudgetIds, onSave, categories }: { visible: boolean, onClose: () => void, projects: any[], existingBudgetIds: string[], onSave: (data: any) => void, categories: { id: string, name: string }[] }) => {
  // Filtrar proyectos que ya tienen presupuesto
  const availableProjects = useMemo(() => projects.filter(p => !existingBudgetIds.includes(p.id)), [projects, existingBudgetIds]);

  const [projectId, setProjectId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryPercentages, setCategoryPercentages] = useState<Record<string, string>>({});
  const { showAlert, AlertComponent } = useCustomAlert();
  const { theme } = useTheme();

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      const newPercentages = { ...categoryPercentages };
      delete newPercentages[catName];
      setCategoryPercentages(newPercentages);
      setSelectedCategories(selectedCategories.filter(c => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  const handleClose = () => {
    setTotalAmount('');
    setSelectedCategories([]);
    setCategoryPercentages({});
    onClose();
  };

  // Seleccionar automáticamente el primer proyecto disponible al abrir el modal
  React.useEffect(() => {
    if (visible) {
      if (availableProjects.length > 0) {
        if (!availableProjects.find(p => p.id === projectId)) {
          setProjectId(availableProjects[0].id);
        }
      } else {
        setProjectId('');
      }
    }
  }, [visible, availableProjects, projectId]);

  const updatePercentage = (catName: string, value: string) => {
    setCategoryPercentages(prev => ({ ...prev, [catName]: value }));
  };

  const handleDistributeRemaining = () => {
    const currentTotal = Object.values(categoryPercentages).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const remaining = Math.max(0, 100 - currentTotal);

    // Identificar categorías seleccionadas que no tienen valor asignado o es 0
    const targets = selectedCategories.filter(cat => !categoryPercentages[cat] || parseFloat(categoryPercentages[cat]) === 0);

    if (targets.length === 0) {
      showAlert(i18n.t('common.info'), remaining > 0 
        ? `Queda un ${remaining.toFixed(1)}% por asignar, pero no hay categorías vacías seleccionadas.` 
        : 'El 100% ya está asignado.');
      return;
    }

    const newPercentages = { ...categoryPercentages };
    const share = remaining / targets.length;
    let distributed = 0;

    targets.forEach((cat, index) => {
      let val = 0;
      if (index === targets.length - 1) {
        // Al último le damos lo que sobra exacto para evitar problemas de redondeo
        val = remaining - distributed;
      } else {
        val = parseFloat(share.toFixed(2));
      }
      newPercentages[cat] = val.toFixed(2).replace(/\.00$/, '');
      distributed += val;
    });

    setCategoryPercentages(newPercentages);
  };

  const handleSave = () => {
    if (!totalAmount) {
      showAlert(i18n.t('common.error'), i18n.t('budgets.enterTotalAmount'));
      return;
    }
    if (selectedCategories.length === 0) {
      showAlert(i18n.t('common.error'), i18n.t('budgets.selectAtLeastOneCategory'));
      return;
    }
    
    // Validar que la suma de porcentajes sea 100%
    const currentTotalPercentage = Object.values(categoryPercentages).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (Math.abs(currentTotalPercentage - 100) > 0.1) {
      showAlert(i18n.t('common.warning'), `La suma de los porcentajes es ${currentTotalPercentage}%. Debería ser 100%.`);
      return;
    }

    const budgetData = {
      projectId,
      totalAmount: parseFloat(totalAmount.replace(/,/g, '')),
      categories: selectedCategories.map(cat => ({
        name: cat,
        percentage: parseFloat(categoryPercentages[cat] || '0'),
        allocated: (parseFloat(totalAmount.replace(/,/g, '')) * (parseFloat(categoryPercentages[cat] || '0') / 100))
      }))
    };

    onSave(budgetData);
    setTotalAmount('');
    setSelectedCategories([]);
    setCategoryPercentages({});
    // onClose se llama desde el padre después de guardar
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{i18n.t('budgets.newBudget')}</Text>
            <Pressable onPress={handleClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>
          
          <Text style={styles.inputLabel}>{i18n.t('common.project')}</Text>
          {availableProjects.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelectorContainer}>
              {availableProjects.map(p => (
                <Pressable key={p.id} onPress={() => setProjectId(p.id)} style={[styles.projectBadge, projectId === p.id && { backgroundColor: '#EBF8FF', borderColor: theme.primaryColor }]}>
                  <Text style={[styles.projectBadgeText, projectId === p.id && { color: theme.primaryColor, fontWeight: '600' }]}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>{i18n.t('budgets.allProjectsAssigned')}</Text>
          )}

          <Text style={styles.inputLabel}>{i18n.t('budgets.totalAmount')}</Text>
          <TextInput 
            style={styles.modalInput} 
            placeholder="0.00" 
            keyboardType="decimal-pad"
            value={totalAmount}
            onChangeText={(text) => setTotalAmount(formatInputCurrency(text))}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.inputLabel, { marginBottom: 0 }]}>{i18n.t('budgets.budgetItems')}</Text>
            <Pressable onPress={handleDistributeRemaining} hitSlop={8}>
              <Text style={{ color: theme.primaryColor, fontSize: 12, fontWeight: 'bold' }}>{i18n.t('budgets.distributeRemaining')}</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>{i18n.t('budgets.selectCategories')}</Text>
          <ScrollView style={styles.categoriesList} nestedScrollEnabled={true}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              const percentage = categoryPercentages[cat.name] || ''; // This is a string
              const rawTotal = parseFloat(totalAmount.replace(/,/g, '')) || 0;
              const calculatedAmount = (rawTotal && percentage)
                ? (rawTotal * (parseFloat(percentage) / 100)) 
                : 0;

              return (
                <View key={cat.id}>
                  <Pressable style={styles.categoryCheckboxRow} onPress={() => toggleCategory(cat.name)}>
                    <Feather 
                      name={isSelected ? "check-square" : "square"} 
                      size={20} 
                      color={isSelected ? theme.primaryColor : "#A0AEC0"} 
                    />
                    <Text style={[styles.categoryCheckboxText, isSelected && styles.categoryCheckboxTextActive]}>{cat.name}</Text>
                  </Pressable>
                  
                  {isSelected && (
                    <View style={styles.percentageRow}>
                      <Text style={styles.percentageLabel}>{i18n.t('budgets.assign')}</Text>
                      <TextInput
                        style={styles.percentageInput}
                        placeholder="0"
                        keyboardType="numeric"
                        maxLength={3}
                        value={percentage}
                        onChangeText={(text) => updatePercentage(cat.name, text)}
                      />
                      <Text style={styles.percentageSymbol}>%</Text>
                      <Text style={[styles.calculatedAmountText, { color: theme.primaryColor }]}>
                        {calculatedAmount > 0 ? formatCurrency(calculatedAmount) : '$0.00'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Pressable style={[styles.saveButton, { backgroundColor: theme.primaryColor }, availableProjects.length === 0 && styles.disabledButton]} onPress={handleSave} disabled={availableProjects.length === 0}>
            <Text style={styles.saveButtonText}>{i18n.t('budgets.createBudget')}</Text>
          </Pressable>
          <AlertComponent />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- Componente Modal de Confirmación de Eliminación ---
const DeleteConfirmationModal = ({ visible, onClose, onConfirm }: { visible: boolean, onClose: () => void, onConfirm: () => void }) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 350 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{i18n.t('common.delete')}</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>
          <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 24 }}>
            {i18n.t('budgets.deleteExpenseConfirmation')}
          </Text>
          <View style={styles.modalButtons}>
            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>{i18n.t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.modalButton, styles.deleteButton]} onPress={onConfirm}>
              <Text style={[styles.buttonText, { color: '#FFF' }]}>{i18n.t('common.delete')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Componente Skeleton Loader ---
const SkeletonItem = ({ style }: { style: any }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[{ backgroundColor: '#EDF2F7', borderRadius: 4 }, style, { opacity }]} />;
};

const BudgetSkeleton = () => {
  return (
    <View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.projectGroup}>
          <View style={styles.groupHeader}>
            <SkeletonItem style={{ width: 20, height: 20, borderRadius: 10, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonItem style={{ width: '50%', height: 20 }} />
            </View>
            <SkeletonItem style={{ width: 80, height: 24, borderRadius: 12 }} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default function BudgetsScreen() {
  const navigation = useNavigation();
  const { projects, budgets, refreshBudgets, isBudgetsLoading } = useProjects(); // Usamos budgets del contexto global
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const { hasPermission } = usePermission();
  const { theme } = useTheme();
  const isSmallScreen = width < 768;
  
  const [refreshing, setRefreshing] = useState(false);
  // Estado para controlar qué modal se muestra
  const [activeModal, setActiveModal] = useState<'none' | 'createBudget' | 'addExpense'>('none');
  const [selectedProjectForExpense, setSelectedProjectForExpense] = useState<string | null>(null);
  
  // Estado para almacenar los nuevos gastos agregados localmente
  const [newExpenses, setNewExpenses] = useState<(Expense & { projectId: string })[]>([]);
  
  const [categoriesCatalog, setCategoriesCatalog] = useState<{ id: string, name: string }[]>([]);
  
  // Estados para Edición y Eliminación
  const [deletedExpenseIds, setDeletedExpenseIds] = useState<string[]>([]);
  const [updatedExpenses, setUpdatedExpenses] = useState<(Expense & { projectId: string })[]>([]);
  const [expenseToEdit, setExpenseToEdit] = useState<(Expense & { projectId: string }) | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string, projectId: string } | null>(null);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const { showAlert, AlertComponent } = useCustomAlert();

  // Cargar catálogo de categorías desde la API
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/project-steps/type/CATEGORY');
        if (response.data) setCategoriesCatalog(response.data);
      } catch (error) {
        console.error('Error fetching categories catalog:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleViewAttachment = async (attachmentId: string) => {
    setViewingAttachmentId(attachmentId);
  };

  const handleCreateBudget = async (data: any) => {
    try {
      // Adaptar datos del modal al formato de la API
      const payload = {
        projectId: data.projectId,
        totalBudget: data.totalAmount,
        categories: data.categories.map((c: any) => ({
          name: c.name,
          allocated: c.allocated,
          spent: 0
        })),
        expenses: []
      };

      const response = await api.post('/api/budgets', payload);
      
      if (response.data) {
        const newBudget = response.data;
        await refreshBudgets(); // Actualizamos el contexto global
        setActiveModal('none');
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      showAlert(i18n.t('common.error'), i18n.t('budgets.errorCreatingBudget'));
    }
  };

  const handleSaveExpense = async (data: { id?: string, projectId: string, concept: string, amount: number, category: string, attachmentUri: string | null }) => {
    try {
      const categoryObj = categoriesCatalog.find(c => c.name === data.category);
      const projectStepId = categoryObj?.id;

      // Determinar si mantenemos el adjunto anterior (solo en edición y si no hay uno nuevo)
      let existingAttachmentId = undefined;
      if (data.id && expenseToEdit && expenseToEdit.id === data.id) {
        existingAttachmentId = expenseToEdit.attachmentId;
      }

      const expensePayload = {
        date: new Date().toISOString().split('T')[0],
        concept: data.concept,
        category: data.category,
        projectStepId: projectStepId,
        amount: data.amount,
        // Si hay URI nueva es true. Si no hay URI nueva pero hay ID existente, también es true.
        attachment: !!data.attachmentUri || (!!existingAttachmentId && !data.attachmentUri),
        // Enviamos el ID anterior si no estamos subiendo un archivo nuevo
        attachmentId: data.attachmentUri ? undefined : existingAttachmentId
      };

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const jsonBlob = new Blob([JSON.stringify(expensePayload)], { type: 'application/json' });
        formData.append('expense', jsonBlob as any);
      } else {
        const json = JSON.stringify(expensePayload);
        const b64 = btoa(unescape(encodeURIComponent(json)));
        formData.append('expense', {
          uri: `data:application/json;base64,${b64}`,
          name: 'expense.json',
          type: 'application/json'
        } as any);
      }

      if (data.attachmentUri) {
        const filename = data.attachmentUri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const response = await fetch(data.attachmentUri);
          const blob = await response.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', {
            uri: data.attachmentUri,
            name: filename,
            type: type,
          } as any);
        }
      }

      if (data.id) {
        // --- EDICIÓN (PUT) ---
        await api.put(`/api/budgets/project/${data.projectId}/expense/${data.id}`, formData, {
          headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
        });
      } else {
        // --- CREACIÓN (POST) ---
        await api.post(`/api/budgets/project/${data.projectId}/expense`, formData, {
          headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
        });
      }

      await refreshBudgets();
      
      // Limpiar estados locales de edición si existían
      if (data.id) {
        setUpdatedExpenses(prev => prev.filter(e => e.id !== data.id));
        setNewExpenses(prev => prev.filter(e => e.id !== data.id));
      }

    } catch (error) {
      console.error('Error saving expense:', error);
      showAlert(i18n.t('common.error'), i18n.t('budgets.errorSavingExpense'));
    }
  };

  const confirmDeleteExpense = async () => {
    if (expenseToDelete) {
      try {
        await api.delete(`/api/budgets/project/${expenseToDelete.projectId}/expense/${expenseToDelete.id}`);
        
        // Animación de deslizamiento/colapso al eliminar
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        // Actualizar la lista localmente para feedback inmediato (opcional, ya que refreshBudgets lo hará)
        setDeletedExpenseIds(prev => [...prev, expenseToDelete.id]);
        await refreshBudgets();
      } catch (error) {
        console.error('Error deleting expense:', error);
        showAlert(i18n.t('common.error'), i18n.t('budgets.errorDeletingExpense'));
      }
      setExpenseToDelete(null);
    }
  };

  const openEditModal = (expense: Expense, projectId: string) => {
    setExpenseToEdit({ ...expense, projectId });
    setSelectedProjectForExpense(projectId);
    setActiveModal('addExpense');
  };
  
  // Filtrar proyectos que tienen presupuesto para mostrarlos en la lista
  const visibleProjects = projects.filter(p => budgets && budgets[p.id] !== undefined);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshBudgets) await refreshBudgets();
    } catch (error) {
      console.error("Error refreshing budgets:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshBudgets]);

  if (!hasPermission('MENU_BUDGETS')) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="lock" size={48} color="#CBD5E0" />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#718096' }}>{i18n.t('common.accessDenied')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      style={[styles.container, isSmallScreen && styles.containerSmall]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />
      }
    >
      <Text style={styles.title}>{i18n.t('budgets.title')}</Text>
      <Text style={styles.subtitle}>{i18n.t('budgets.subtitle')}</Text>

      {/* Mostrar Skeleton si está cargando y no hay datos previos */}
      {isBudgetsLoading && (!budgets || Object.keys(budgets).length === 0) ? (
        <BudgetSkeleton />
      ) : (
        <>
      {visibleProjects.length > 0 ? visibleProjects.map(project => (
        <ProjectBudgetGroup 
          key={project.id} 
          project={project} 
          extraExpenses={newExpenses.filter(e => e.projectId === project.id)}
          customBudget={budgets[project.id]}
          deletedExpenseIds={deletedExpenseIds}
          updatedExpenses={updatedExpenses}
          onAddExpense={() => {
            setExpenseToEdit(null); // Aseguramos que no estamos editando
            setSelectedProjectForExpense(project.id);
            setActiveModal('addExpense');
          }}
          onDeleteExpense={(id) => setExpenseToDelete({ id, projectId: project.id })}
          onEditExpense={(expense) => openEditModal(expense, project.id)}
          onViewAttachment={handleViewAttachment}
          canUpdate={hasPermission('BUDGET_UPDATE')}
          canDelete={hasPermission('BUDGET_DELETE')}
        />
      )) : (
        <View style={{ padding: 40, alignItems: 'center', opacity: 0.7 }}>
          <Feather name="clipboard" size={48} color="#CBD5E0" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#718096', textAlign: 'center' }}>
            {i18n.t('budgets.noActiveBudgets')}
          </Text>
          <Text style={{ fontSize: 14, color: '#A0AEC0', textAlign: 'center', marginTop: 4 }}>
            {i18n.t('budgets.createOneHint')}
          </Text>
        </View>
      )}
        </>
      )}
      <View style={{ height: 40 }} />

      </ScrollView>
      {hasPermission('BUDGET_CREATE') && (
        <Pressable style={[styles.fab, { backgroundColor: theme.primaryColor }]} onPress={() => setActiveModal('createBudget')}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>
      )}
      {/* Modal para Crear Presupuesto (Header Button) */}
      <CreateBudgetModal 
        visible={activeModal === 'createBudget'} 
        onClose={() => setActiveModal('none')} 
        projects={projects} 
        existingBudgetIds={budgets ? Object.keys(budgets) : []}
        onSave={handleCreateBudget}
        categories={categoriesCatalog}
      />

      {/* Modal para Agregar Gasto (Botón interno) */}
      <AddExpenseModal 
        visible={activeModal === 'addExpense'} 
        onClose={() => setActiveModal('none')} 
        projects={projects}
        initialProjectId={selectedProjectForExpense}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        categories={categoriesCatalog}
      />

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmationModal 
        visible={!!expenseToDelete} 
        onClose={() => setExpenseToDelete(null)} 
        onConfirm={confirmDeleteExpense} 
      />

      <AttachmentViewerModal
        visible={!!viewingAttachmentId}
        attachmentId={viewingAttachmentId}
        onClose={() => setViewingAttachmentId(null)}
        token={token}
      />
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  containerSmall: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
  
  // Estilos del Acordeón
  projectGroup: { marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F7FAFC' },
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginLeft: 12, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  groupContent: { padding: 16, backgroundColor: '#FFF' },

  // Estilos de Tarjetas
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { flex: 1, minWidth: 140, backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#718096', marginBottom: 4, textAlign: 'center' },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },

  // Estilos de Secciones
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 12 },
  
  // Barras de Progreso
  progressRow: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
  categoryValues: { fontSize: 12, color: '#718096' },
  progressBarBg: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  overBudgetTag: {
    backgroundColor: '#FED7D7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  overBudgetText: {
    color: '#C53030',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Historial y Tabla
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#718096', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  exportButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#38A169', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#2D3748' },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 8 },
  headerText: { fontSize: 12, fontWeight: 'bold', color: '#718096' },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EDF2F7', paddingVertical: 12 },
  
  // Columnas
  colDate: { width: 80, fontSize: 12, color: '#718096' },
  colConcept: { flex: 1.5, paddingHorizontal: 8, fontSize: 14, color: '#2D3748', fontWeight: '500' },
  colCategory: { flex: 1, paddingHorizontal: 8, alignItems: 'flex-start' },
  categoryTag: { backgroundColor: '#FEFCBF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryTagText: { fontSize: 12, color: '#4A5568', fontWeight: '500' },
  colAmount: { width: 80, fontSize: 14, fontWeight: 'bold', color: '#2D3748', textAlign: 'right' },
  colAttachment: { width: 50, alignItems: 'center', justifyContent: 'center' },
  colActions: { width: 60, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionButton: { padding: 4 },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, maxHeight: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  modalInput: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#2D3748' },
  saveButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  disabledButton: { backgroundColor: '#A0AEC0' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#718096', fontStyle: 'italic', marginBottom: 16 },
  
  // Estilos para el Selector (ComboBox)
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownContainer: {
    position: 'absolute',
    top: 50, // Altura del input + margen
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  dropdownItemText: { fontSize: 16, color: '#2D3748' },
  
  // Selector de Proyecto en Modal
  projectSelectorContainer: { flexDirection: 'row', marginBottom: 16, maxHeight: 40 },
  projectBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    backgroundColor: '#EDF2F7', 
    marginRight: 8, 
    borderWidth: 1, 
    borderColor: 'transparent' 
  },
  projectBadgeText: { 
    color: '#4A5568', 
    fontSize: 14 
  },

  // Estilos para carga de archivos
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  uploadButtonText: { marginLeft: 8, color: '#4A5568', fontSize: 16 },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  attachmentText: { flex: 1, marginLeft: 8, color: '#2C5282', fontSize: 14 },

  // Estilos para selección de categorías en Crear Presupuesto
  helperText: { fontSize: 12, color: '#718096', marginBottom: 8 },
  categoriesList: { maxHeight: 150, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 16, padding: 8 },
  categoryCheckboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  categoryCheckboxText: { marginLeft: 10, fontSize: 14, color: '#4A5568' },
  categoryCheckboxTextActive: { color: '#2D3748', fontWeight: '600' },
  
  // Estilos para inputs de porcentaje
  percentageRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 34, marginBottom: 8 },
  percentageLabel: { fontSize: 12, color: '#718096', marginRight: 8 },
  percentageInput: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, width: 50, textAlign: 'center', fontSize: 14, color: '#2D3748' },
  percentageSymbol: { fontSize: 14, color: '#4A5568', marginLeft: 4, marginRight: 12 },
  calculatedAmountText: { fontSize: 12, fontWeight: 'bold' },

  // Estilos para botones del modal de confirmación
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#EDF2F7' },
  deleteButton: { backgroundColor: '#E53E3E' },
  buttonText: { fontWeight: 'bold', fontSize: 14, color: '#4A5568' },

  // Estilos para el visor de adjuntos
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullscreenContent: {
    width: '95%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  // Estilos Skeleton
  skeletonItem: {
    height: 60,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});