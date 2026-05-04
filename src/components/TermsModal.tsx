import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  onAccept,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>End User License Agreement</Text>
        </View>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.text}>
            <Text style={styles.bold}>Effective Date: 04/01/2025</Text>
            {'\n\n'}
            Welcome to Off Road Treasure Quest (“ORTQ,” “we,” “us,” or “our”). By accessing or using our Service, you agree to be bound by these Terms.
            {'\n\n'}
            <Text style={styles.bold}>1. ZERO TOLERANCE FOR OBJECTIONABLE CONTENT</Text>
            {'\n'}
            ORTQ maintains a <Text style={styles.bold}>zero-tolerance policy</Text> regarding objectionable content or abusive users. You may not post content that is harassing, threatening, defamatory, obscene, or otherwise objectionable. We act on all reports within 24 hours. Failure to comply will result in immediate account termination and a permanent ban.
            {'\n\n'}
            <Text style={styles.bold}>2. ELIGIBILITY & REGISTRATION</Text>
            {'\n'}
            You must be at least 18 years of age to use the Service. You agree to provide accurate information and are responsible for maintaining the confidentiality of your account credentials.
            {'\n\n'}
            <Text style={styles.bold}>3. PARTICIPATION IN QUESTS (ASSUMPTION OF RISK)</Text>
            {'\n'}
            Participation in ORTQ activities, including treasure hunts and quests, is voluntary and at your own risk. Off-road driving involves inherent risks, including injury, death, and property damage. You are responsible for your own safety and must follow all local laws and safety guidelines. ORTQ does not guarantee the safety or accessibility of any quest location.
            {'\n\n'}
            <Text style={styles.bold}>4. TREASURE HUNTS AND PRIZES</Text>
            {'\n'}
            Only the qualified user who receives a treasure map may redeem a prize. Prizes are subject to availability and must be redeemed according to the provided instructions. ORTQ is not responsible for lost, stolen, or damaged treasure maps or prizes.
            {'\n\n'}
            <Text style={styles.bold}>5. USER CONDUCT & "LEAVE NO TRACE"</Text>
            {'\n'}
            You agree to use the Service responsibly, respect the environment, and follow “Leave No Trace” principles. Do not engage in behavior that harms other users, wildlife, or the environment.
            {'\n\n'}
            <Text style={styles.bold}>6. LIMITATION OF LIABILITY</Text>
            {'\n'}
            To the maximum extent permitted by law, ORTQ and its affiliates will not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. You agree to indemnify and hold ORTQ harmless from any claims arising out of your violation of these Terms.
            {'\n\n'}
            <Text style={styles.bold}>7. PRIVACY POLICY SUMMARY</Text>
            {'\n'}
            We collect Account Data (email, name) and Precise Location Data (GPS) to verify quest arrivals. We do not sell your personal data. You have the right to delete your account and all associated data at any time via Profile > Account Settings.
            {'\n\n'}
            <Text style={styles.bold}>8. CONTACT US</Text>
            {'\n'}
            Adventure Bound Software
            {'\n'}
            Email: administration@offroadtreasurequest.com
            {'\n'}
            Address: 500 Sombrero, Horseshoe Bay, TX 78657
            {'\n\n'}
            By clicking "I Accept and Agree", you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
