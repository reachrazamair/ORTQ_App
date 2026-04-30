import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RenderHtml from 'react-native-render-html';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AppInfo'>;
};

type ContentPage = {
  id: number;
  title: string;
  description: string | null;
  updated_at: string;
};

function PageCard({ page }: { page: ContentPage }) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();
  const contentWidth = width - 64; // account for card padding

  return (
    <View style={styles.pageCard}>
      <TouchableOpacity
        style={styles.pageHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <Text style={styles.pageTitle}>{page.title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9AA0A6"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.pageBody}>
          {page.description ? (
            <RenderHtml
              contentWidth={contentWidth}
              source={{ html: page.description }}
              tagsStyles={htmlStyles}
            />
          ) : (
            <Text style={styles.emptyDesc}>No content available.</Text>
          )}
          <Text style={styles.updatedAt}>
            Last updated:{' '}
            {new Date(page.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AppInfoScreen({ navigation }: Props) {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('content_pages')
          .select('id, title, description, updated_at')
          .order('title');
        if (!error && data) setPages(data as ContentPage[]);
        setLoading(false);
      };
      load();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>App Support & Resources</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : pages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No informational content available.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pages.map(page => (
            <PageCard key={page.id} page={page} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// HTML tag styles passed to react-native-render-html
const htmlStyles = {
  p: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 8 },
  li: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#374151', lineHeight: 22 },
  h1: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey, marginBottom: 8 },
  h2: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.blueGrey, marginBottom: 6 },
  h3: { fontFamily: Fonts.firaSansBold, fontSize: 15, color: Colors.blueGrey, marginBottom: 4 },
  strong: { fontFamily: Fonts.firaSansBold },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#9AA0A6', textAlign: 'center' },

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

  pageCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pageTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: Colors.blueGrey,
    flex: 1,
    marginRight: 8,
  },
  pageBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  emptyDesc: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#9AA0A6' },
  updatedAt: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 8,
  },
});
