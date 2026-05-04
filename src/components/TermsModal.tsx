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
            Welcome to ORTQ: Off Road Treasure Quest. By using this app, you
            agree to the following terms and conditions (EULA).
            {'\n\n'}
            <Text style={styles.bold}>1. Objectionable Content Policy</Text>
            {'\n'}
            There is <Text style={styles.bold}>zero tolerance</Text> for
            objectionable content or abusive users. Users who post content that
            is deemed offensive, harassing, or illegal will have their accounts
            terminated immediately and their content removed.
            {'\n\n'}
            <Text style={styles.bold}>2. User-Generated Content</Text>
            {'\n'}
            You are solely responsible for the content you post. By posting
            content, you grant ORTQ a non-exclusive, worldwide, royalty-free
            license to display, distribute, and reproduce your content within
            the application for its intended purpose.
            {'\n\n'}
            <Text style={styles.bold}>3. Moderation and Reporting</Text>
            {'\n'}
            ORTQ provides mechanisms to flag objectionable content and block
            abusive users. We act on all reports within 24 hours. Failure to
            comply with these terms may result in a permanent ban.
            {'\n\n'}
            <Text style={styles.bold}>4. Safety and Risk Acknowledgment</Text>
            {'\n'}
            Off-roading involves inherent risks, including injury or death. ORTQ
            is a tool for adventure but is not responsible for any injury,
            property damage, or legal issues incurred while using the app or
            participating in quests. Always follow local laws and trail
            regulations.
            {'\n\n'}
            <Text style={styles.bold}>5. Subscription and Payments</Text>
            {'\n'}
            Access to certain features or "Quests" may require payment.
            Subscriptions and one-time payments are managed via Stripe. Refund
            policies are subject to Stripe and App Store guidelines.
            {'\n\n'}
            <Text style={styles.bold}>6. Intellectual Property</Text>
            {'\n'}
            The ORTQ name, logo, and software are the property of ORTQ. You may
            not reverse engineer, decompile, or attempt to extract the source
            code of the application.
            {'\n\n'}
            <Text style={styles.bold}>7. Privacy</Text>
            {'\n'}
            Your privacy is important to us. We collect location data to provide
            trail tracking and discovery features. Please refer to our full
            Privacy Policy for details on how we handle your data.
            {'\n\n'}
            <Text style={styles.bold}>8. Termination</Text>
            {'\n'}
            We reserve the right to terminate or suspend access to our service
            immediately, without prior notice or liability, for any reason
            whatsoever, including without limitation if you breach the Terms.
            {'\n\n'}
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
