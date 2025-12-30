import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useProjects } from '../../contexts/ProjectsContext';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import i18n from '../../constants/i18n';

// --- Helper para simular datos de gastos (Mock) ---
const getMockExpenses = (projectId: string) => {
  return [
    { date: '2023-10-01', concept: 'Concreto premezclado', category: 'Cimentación', amount: 15000 },
    { date: '2023-10-05', concept: 'Varilla 3/8', category: 'Estructura', amount: 8000 },
    { date: '2023-10-12', concept: 'Nómina semanal', category: 'Albañilería', amount: 5000 },
    { date: '2023-10-15', concept: 'Tubería PVC', category: 'Instalaciones', amount: 2500 },
  ];
};

export default function ReportsScreen() {
  const { projects, getChecklistByProjectId } = useProjects();

  // 1. Calcular Estadísticas Dinámicas
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const delayedProjects = projects.filter(p => p.status === 'Delayed').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  // Calcular estadísticas de tareas (Checklist)
  let totalTasks = 0;
  let completedTasks = 0;
  
  projects.forEach(p => {
    const tasks = getChecklistByProjectId(p.id);
    totalTasks += tasks.length;
    completedTasks += tasks.filter(t => t.completed).length;
  });

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Función para Generar PDF
  const generatePdf = async () => {
    // Generar HTML para la sección de presupuestos
    const budgetSectionHtml = projects.map(p => {
      const expenses = getMockExpenses(p.id);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      
      return `
        <div style="margin-top: 20px;">
          <h4>${p.name} - Gastos ($${totalExpenses.toLocaleString()})</h4>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th></tr>
            </thead>
            <tbody>
              ${expenses.map(e => `
                <tr>
                  <td>${e.date}</td><td>${e.concept}</td><td>${e.category}</td><td>$${e.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            h1 { color: #2D3748; }
            .card { border: 1px solid #E2E8F0; padding: 15px; margin-bottom: 10px; border-radius: 8px; background-color: #F7FAFC; }
            .stat-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { color: #718096; }
            .value { font-weight: bold; color: #1A202C; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #EDF2F7; color: #2D3748; }
            .status-delayed { color: #E53E3E; font-weight: bold; }
            .status-completed { color: #38A169; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Reporte General de Proyectos</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString()}</p>
          
          <div class="card">
            <h3>Resumen Ejecutivo</h3>
            <div class="stat-row"><span class="label">Total Proyectos:</span> <span class="value">${totalProjects}</span></div>
            <div class="stat-row"><span class="label">Activos:</span> <span class="value">${activeProjects}</span></div>
            <div class="stat-row"><span class="label">Retrasados:</span> <span class="value">${delayedProjects}</span></div>
            <div class="stat-row"><span class="label">Completados:</span> <span class="value">${completedProjects}</span></div>
            <div class="stat-row"><span class="label">Tasa Global de Tareas:</span> <span class="value">${taskCompletionRate}%</span></div>
          </div>

          <h3>Detalle de Proyectos</h3>
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Progreso</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              ${projects.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.client}</td>
                  <td class="${p.status === 'Delayed' ? 'status-delayed' : p.status === 'Completed' ? 'status-completed' : ''}">${p.status}</td>
                  <td>${p.progress}%</td>
                  <td>${p.address || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3>Desglose de Gastos por Presupuesto</h3>
          ${budgetSectionHtml}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte PDF.');
      console.error(error);
    }
  };

  const generateExcel = () => {
    // Nota: Para Excel real se requiere instalar la librería 'xlsx'.
    // Aquí mostramos la alerta simulando la acción.
    Alert.alert('Exportar a Excel', 'Se generaría un archivo .xlsx con el desglose de presupuestos y tareas.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('nav.reports') || 'Reportes'}</Text>
        <Text style={styles.subtitle}>Resumen general y exportación de datos</Text>
      </View>

      {/* Tarjetas de Resumen */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#EBF8FF' }]}>
            <Feather name="briefcase" size={24} color="#3182CE" />
          </View>
          <Text style={styles.statValue}>{totalProjects}</Text>
          <Text style={styles.statLabel}>Total Proyectos</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#F0FFF4' }]}>
            <Feather name="activity" size={24} color="#38A169" />
          </View>
          <Text style={styles.statValue}>{activeProjects}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF5F5' }]}>
            <Feather name="alert-circle" size={24} color="#E53E3E" />
          </View>
          <Text style={styles.statValue}>{delayedProjects}</Text>
          <Text style={styles.statLabel}>Retrasados</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FAF5FF' }]}>
            <Feather name="check-square" size={24} color="#805AD5" />
          </View>
          <Text style={styles.statValue}>{taskCompletionRate}%</Text>
          <Text style={styles.statLabel}>Tareas Completadas</Text>
        </View>
      </View>

      {/* Sección de Exportación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exportar Datos</Text>
        <View style={styles.exportButtonsContainer}>
          <Pressable style={[styles.exportButton, { backgroundColor: '#E53E3E' }]} onPress={generatePdf}>
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={styles.exportButtonText}>Generar PDF</Text>
          </Pressable>
          
          <Pressable style={[styles.exportButton, { backgroundColor: '#276749' }]} onPress={generateExcel}>
            <Feather name="grid" size={20} color="#FFF" />
            <Text style={styles.exportButtonText}>Exportar Excel</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabla de Vista Previa */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vista Previa de Proyectos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.headerText]}>Proyecto</Text>
            <Text style={[styles.colStatus, styles.headerText]}>Estado</Text>
            <Text style={[styles.colProgress, styles.headerText]}>Progreso</Text>
          </View>
          {projects.map(p => (
            <View key={p.id} style={styles.tableRow}>
              <Text style={styles.colName}>{p.name}</Text>
              <View style={[styles.statusBadge, 
                p.status === 'Delayed' ? { backgroundColor: '#FED7D7' } : 
                p.status === 'Completed' ? { backgroundColor: '#C6F6D5' } : 
                { backgroundColor: '#BEE3F8' }
              ]}>
                <Text style={[styles.statusText,
                  p.status === 'Delayed' ? { color: '#C53030' } : 
                  p.status === 'Completed' ? { color: '#276749' } : 
                  { color: '#2C5282' }
                ]}>{p.status}</Text>
              </View>
              <Text style={styles.colProgress}>{p.progress}%</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, minWidth: 140, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#718096', textAlign: 'center' },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  
  exportButtonsContainer: { flexDirection: 'row', gap: 16 },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  exportButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  table: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F7FAFC', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerText: { fontWeight: 'bold', color: '#4A5568', fontSize: 14 },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', alignItems: 'center' },
  colName: { flex: 2, fontSize: 14, color: '#2D3748', fontWeight: '500' },
  colStatus: { flex: 1, alignItems: 'flex-start' },
  colProgress: { flex: 1, textAlign: 'right', fontSize: 14, color: '#4A5568' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
});