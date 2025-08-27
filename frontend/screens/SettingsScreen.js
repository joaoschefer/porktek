// src/screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Card, Switch, Text, Divider, Button, List } from 'react-native-paper';

export default function SettingsScreen() {
  const [notificacoes, setNotificacoes] = useState(true);
  const [temaEscuro, setTemaEscuro] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Configurações</Text>

      <Card style={styles.card}>
        <Card.Title title="Preferências" />
        <Card.Content>
          <View style={styles.row}>
            <Text style={styles.label}>Notificações</Text>
            <Switch value={notificacoes} onValueChange={setNotificacoes} />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Tema Escuro</Text>
            <Switch value={temaEscuro} onValueChange={setTemaEscuro} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Sobre o App" />
        <Card.Content>
          <List.Item
            title="Versão"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Documentação"
            description="Abrir site oficial"
            onPress={() => Linking.openURL('https://seu-site.com')}
            left={(props) => <List.Icon {...props} icon="open-in-new" />}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.logoutButton}
        onPress={() => console.log('Logout')}
      >
        Sair da Conta
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F6F9FC', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#2C3E50' },
  card: { marginBottom: 16, borderRadius: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 16, color: '#2C3E50' },
  divider: { marginVertical: 4 },
  logoutButton: { marginTop: 16, borderRadius: 12, backgroundColor: '#B00020' },
});
