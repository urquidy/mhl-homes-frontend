import { Fonts } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '../../constants/i18n';

interface ItemDetailModalProps {
  visible: boolean;
  item: any;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onDelete: () => void;
  onAddEvidence: () => void;
  onDeleteEvidence: (evidenceId: string) => void;
  onPostComment: () => void;
  newComment: string;
  setNewComment: (text: string) => void;
  userRole?: string;
  getPlanImageSource: (uri: string) => any;
  onViewImage: (source: any, type: 'image' | 'pdf') => void;
}

export default function ItemDetailModal({
  visible, item, onClose, onToggleStatus, onDelete, onAddEvidence, onDeleteEvidence,
  onPostComment, newComment, setNewComment, userRole, getPlanImageSource, onViewImage
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('projectDetail.taskDetailTitle')}</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={styles.text}>{item.text}</Text>
            <View style={styles.statusRow}>
              {item.deadline && (
                <View style={styles.deadlineBadge}>
                  <Feather name="calendar" size={14} color="#E53E3E" style={{ marginRight: 4 }} />
                  <Text style={styles.deadlineText}>{item.deadline}</Text>
                </View>
              )}
              <Text style={styles.statusLabel}>{i18n.t('common.status')}:</Text>
              <Pressable onPress={() => onToggleStatus(item.id)} style={styles.statusButton}>
                <Text style={[styles.statusButtonText, { color: item.completed ? '#38A169' : '#E53E3E' }]}>
                  {item.completed ? i18n.t('common.completed') : i18n.t('common.pending')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionHeader}>{i18n.t('projectDetail.evidence')}</Text>
            <View style={styles.evidenceGrid}>
              {item.evidence?.map((ev: any) => (
                <View key={ev.id} style={{ position: 'relative' }}>
                  <Pressable onPress={() => onViewImage(getPlanImageSource(ev.uri), 'image')}>
                    <Image source={getPlanImageSource(ev.uri) || { uri: '' }} style={styles.thumbnail} />
                    {ev.type === 'video' && (
                      <View style={styles.videoOverlay}>
                        <Feather name="play-circle" size={20} color="#FFF" />
                      </View>
                    )}
                  </Pressable>
                  <Pressable style={styles.removeButton} onPress={() => onDeleteEvidence(ev.id)} hitSlop={8}>
                    <Feather name="x" size={12} color="#FFF" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addButton} onPress={onAddEvidence}>
                <Feather name="plus" size={24} color="#4A5568" />
                <Text style={styles.addText}>{i18n.t('projectDetail.add')}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionHeader}>{i18n.t('projectDetail.comments')}</Text>
            {item.comments?.map((comment: any) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.commentAuthor}>
                    {comment.author || 'Usuario'} 
                    {comment.role ? <Text style={{ fontWeight: 'normal', color: '#A0AEC0' }}> • {comment.role}</Text> : null}
                  </Text>
                  <Text style={styles.commentDate}>{new Date(comment.date).toLocaleDateString()} {new Date(comment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}

            {userRole === 'ADMIN' && (
              <Pressable onPress={onDelete} style={styles.deleteButton}>
                <Feather name="trash-2" size={20} color="#FFF" />
                <Text style={styles.deleteText}>{i18n.t('projectDetail.deleteTask')}</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('projectDetail.writeComment')}
              value={newComment}
              onChangeText={setNewComment}
            />
            <Pressable onPress={onPostComment} style={styles.sendButton}>
              <Feather name="send" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  content: { width: '100%', maxWidth: 600, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontFamily: Fonts.title, color: '#1A202C' },
  text: { fontSize: 18, marginBottom: 16, color: '#2D3748', fontFamily: Fonts.regular },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  deadlineBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 16, backgroundColor: '#FFF5F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deadlineText: { fontSize: 12, color: '#E53E3E', fontFamily: Fonts.bold },
  statusLabel: { fontSize: 16, color: '#718096', marginRight: 8, fontFamily: Fonts.medium },
  statusButton: { padding: 4 },
  statusButtonText: { fontSize: 16, fontFamily: Fonts.bold },
  sectionHeader: { fontSize: 18, fontFamily: Fonts.title, color: '#2D3748', marginTop: 20, marginBottom: 12 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#EDF2F7' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 },
  removeButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#E53E3E', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', zIndex: 10, elevation: 2 },
  addButton: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 12, color: '#718096', marginTop: 4, fontFamily: Fonts.medium },
  commentItem: { backgroundColor: '#F7FAFC', padding: 16, borderRadius: 12, marginBottom: 12 },
  commentAuthor: { fontSize: 14, fontFamily: Fonts.bold, color: '#2D3748' },
  commentDate: { fontSize: 12, color: '#A0AEC0', marginTop: 2, textAlign: 'right', fontFamily: Fonts.regular },
  commentText: { fontSize: 14, color: '#4A5568', fontFamily: Fonts.regular, marginTop: 4 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53E3E', padding: 16, borderRadius: 12, marginTop: 32 },
  deleteText: { color: '#FFF', fontFamily: Fonts.bold, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#EDF2F7', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginRight: 12, fontFamily: Fonts.regular, fontSize: 16 },
  sendButton: { backgroundColor: '#3182CE', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
});