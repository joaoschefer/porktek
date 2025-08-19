// src/navigation/HomeStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoteAtualScreen from '../screens/LoteAtualScreen';
import LoteFinalizadoScreen from '../screens/LoteFinalizadoScreen';

import ChegadaScreen from '../screens/ChegadaScreen';
import MortesScreen from '../screens/MortesScreen';
import ObsGeraisScreen from '../screens/ObsGeraisScreen';
import RacaoScreen from '../screens/RacaoScreens';
import SaidaScreen from '../screens/SaidaScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Lista de Lotes" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Lote Atual" component={LoteAtualScreen} />
      <Stack.Screen name="Lote Finalizado" component={LoteFinalizadoScreen} />

      <Stack.Screen name="Chegada" component={ChegadaScreen} />
      <Stack.Screen name="Mortes" component={MortesScreen} />
      <Stack.Screen name="Observacoes Gerais" component={ObsGeraisScreen} />
      <Stack.Screen name="Racao" component={RacaoScreen} />
      <Stack.Screen name="Saida" component={SaidaScreen} options={{ title: 'Saída' }} />
    </Stack.Navigator>
  );
}
