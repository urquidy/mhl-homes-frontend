import { Feather } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';

interface VideoPlayerModalProps {
  isVisible: boolean;
  videoUri: string;
  onClose: () => void;
}

export default function VideoPlayerModal({ isVisible, videoUri, onClose }: VideoPlayerModalProps) {
  const [isBuffering, setIsBuffering] = useState(true);
  const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.play();
  });

  useEventListener(player, 'statusChange', (event) => {
    setIsBuffering(event.status === 'loading');
  });

  useEffect(() => {
    if (!isVisible) {
      player.pause();
    } else {
      setIsBuffering(true);
      player.play();
    }
  }, [isVisible, player]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="black" />
          </Pressable>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls
            contentFit="contain"
          />
          {isBuffering && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    height: '80%',
  },
  video: {
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
