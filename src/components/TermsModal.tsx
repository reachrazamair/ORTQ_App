import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onAccept }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>End User License Agreement</Text>
        </View>
        <ScrollView style={styles.content}>
          <Text style={styles.text}>
            Welcome to ORTQ: Off Road Treasure Quest. By using this app, you agree to the following terms and conditions (EULA).
            {"\n\n"}
            <Text style={styles.bold}>1. Objectionable Content Policy</Text>
            {"\n"}
            There is <Text style={styles.bold}>zero tolerance</Text> for objectionable content or abusive users. Users who post content that is deemed offensive, harassing, or illegal will have their accounts terminated immediately and their content removed.
            {"\n\n"}
            <Text style={styles.bold}>2. User-Generated Content</Text>
            {"\n"}
            You are solely responsible for the content you post. By posting content, you grant ORTQ a non-exclusive license to display it within the app.
            {"\n\n"}
            <Text style={styles.bold}>3. Moderation</Text>
            {"\n"}
            ORTQ provides mechanisms to flag objectionable content and block abusive users. We act on reports within 24 hours.
            {"\n\n"}
            <Text style={styles.bold}>4. Safety</Text>
            {"\n"}
            Off-roading involves inherent risks. ORTQ is not responsible for any injury or property damage incurred while using the app or participating in quests.
            {"\n\n"}
            ... (Rest of the EULA text)
            {"\n\n"}
            By clicking "Accept", you agree to these terms.
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={onAccept}>
            <Text style={styles.buttonText}>I Accept and Agree</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  bold: {
    fontFamily: Fonts.firaSansBold,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    backgroundColor: Colors.orange,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: Fonts.firaSansBold,
    color: '#fff',
    fontSize: 16,
  },
});
