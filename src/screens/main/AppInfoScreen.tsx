import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AppInfo'>;
  route: RouteProp<ProfileStackParamList, 'AppInfo'>;
};

type Section = {
  heading?: string;
  body: string;
  bullets?: string[];
};

const ABOUT_SECTIONS: Section[] = [
  {
    body: 'Off Road Treasure Quest (ORTQ) is an adventure platform built for off-road enthusiasts. Explore real trails, unlock hidden GPS checkpoints, earn points, and compete on leaderboards — all from your phone.',
  },
  {
    heading: 'How It Works',
    body: 'Each quest covers a set of off-road trails in a specific region. Purchase keys, join a quest, and unlock trail checkpoints as you explore. When you physically arrive at a hidden location, the app verifies your GPS position and marks the trail complete.',
  },
  {
    heading: 'Offline Ready',
    body: 'Trails run through remote areas with no cell service. ORTQ works fully offline — maps and checkpoints are downloaded before you head out, and completions sync automatically when you reconnect.',
  },
  {
    heading: 'Keys & Points',
    body: 'Keys are used to unlock trail checkpoints. Points are earned when you complete trails. Compete with other adventurers on the regional leaderboard for each active quest.',
  },
  {
    heading: 'Contact',
    body: 'Adventure Bound Software\nAdministration@offroadtreasurequest.com\n500 Sombrero, Horseshoe Bay, TX 78657',
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    body: 'Effective Date: 04/01/2025',
  },
  {
    heading: '1. Introduction',
    body: 'Welcome to Off Road Treasure Quest ("we," "our," or "us"). We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and share information about you when you use our mobile application ("App") and related services (collectively, the "Services").\n\nBy accessing or using our Services, you agree to the collection, use, and disclosure of your information as described in this Privacy Policy. If you disagree with this policy, please do not use our Services.',
  },
  {
    heading: '2. Information We Collect',
    body: 'a. Information You Provide to Us:',
    bullets: [
      'Account Information: When you create an account, we collect your name, email address, and password.',
      'Payment Information: If you join a quest, we collect payment details such as credit card information, which is processed securely by a third-party payment processor.',
      'User Content: Photos, videos, or other content you upload as part of your participation in quests.',
    ],
  },
  {
    body: 'b. Information We Automatically Collect:',
    bullets: [
      'Device Information: Details about the device you use to access our App, including hardware model, operating system, and browser type.',
      'Location Data: Precise geolocation data to verify your arrival at quest locations. You will have the option to enable or disable location tracking through your device settings.',
      'Usage Data: Information about how you interact with our App, including pages visited, time spent, and features used.',
    ],
  },
  {
    body: 'c. Information from Third Parties: We may receive information about you from third-party services, such as social media platforms if you connect your account to our App.',
  },
  {
    heading: '3. How We Use Your Information',
    body: 'We use the information we collect for the following purposes:',
    bullets: [
      'To provide and maintain the Services, including tracking quest progress and awarding points.',
      'To process payments and deliver rewards.',
      'To communicate with you about updates, promotions, and customer support inquiries.',
      'To personalize your experience and recommend quests.',
      'To ensure safety and compliance with our terms of use.',
      'To analyze usage and improve the functionality and user experience of the App.',
    ],
  },
  {
    heading: '4. How We Share Your Information',
    body: 'We may share your information with:',
    bullets: [
      'Service Providers: Third-party vendors who perform services on our behalf, such as payment processors and hosting providers.',
      'Other Users: Your username and profile information may be visible to users participating in the same quests.',
      'Legal Obligations: If required, authorities or entities must comply with legal obligations or protect our rights.',
      'Business Transfers: In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner.',
    ],
  },
  {
    body: 'We do not sell your personal information to third parties.',
  },
  {
    heading: '5. Data Security',
    body: 'We implement industry-standard security measures to protect your information. However, no method of transmission over the Internet or electronic storage is entirely secure. While we strive to protect your personal information, we cannot guarantee its absolute security.',
  },
  {
    heading: '6. Your Choices',
    bullets: [
      'Access and Update: You may access and update your account information through the App.',
      'Location Data: You can enable or disable location tracking via your device settings.',
      'Communications: Opt out of promotional emails by following the unsubscribe instructions or contacting us.',
    ],
  },
  {
    heading: "7. Children's Privacy",
    body: "Our Services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please get in touch with us, and we will delete it.",
  },
  {
    heading: '8. Changes to This Privacy Policy',
    body: 'We may update this Privacy Policy from time to time. Any changes will be posted within the App and will include the "Effective Date" of the revised policy. Your continued use of the Services after the changes are posted constitutes your acceptance of the updated Privacy Policy.',
  },
  {
    heading: '9. Contact Us',
    body: 'If you have questions or concerns about this Privacy Policy, don\'t hesitate to get in touch with us at:\n\nAdventure Bound Software\nAdministration@offroadtreasurequest.com\n500 Sombrero, Horseshoe Bay, TX 78657',
  },
  {
    body: 'Thank you for trusting Off Road Treasure Quest to be a part of your adventures!',
  },
];

export default function AppInfoScreen({ navigation, route }: Props) {
  const { title } = route.params;
  const isPrivacy = title === 'Privacy Policy';
  const sections = isPrivacy ? PRIVACY_SECTIONS : ABOUT_SECTIONS;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{title}</Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            {section.heading && (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            )}
            {section.body && (
              <Text style={styles.sectionBody}>{section.body}</Text>
            )}
            {section.bullets && section.bullets.map((bullet, bi) => (
              <View key={bi} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, alignItems: 'center' },
  topBarTitle: { fontFamily: Fonts.gothamBold, fontSize: 17, color: Colors.blueGrey },

  pageTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: Colors.blueGrey,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: Colors.blueGrey,
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  bulletDot: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
});
