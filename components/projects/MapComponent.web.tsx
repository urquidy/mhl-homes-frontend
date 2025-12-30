import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import i18n from '../../constants/i18n';

const MapComponent = (props: any) => (
  <View style={[props.style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' }]}>
    <Feather name="map" size={48} color="#CBD5E0" />
    <Text style={{ marginTop: 16, color: '#4A5568', textAlign: 'center', fontWeight: '600' }}>
      {i18n.t('map.webFallback')}
    </Text>
    <Text style={{ marginTop: 8, color: '#718096', textAlign: 'center', fontSize: 14, paddingHorizontal: 40 }}>
      {i18n.t('map.webInstruction')}
    </Text>
  </View>
);

export default MapComponent;
