import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'KeyUsage'>;
};

type TrailParticipant = {
  id: string;
  trail_name: string;
  keys_used: number;
  joined_at: string;
  completed_at: string | null;
  points_earned: number | null;
};

type QuestSummary = {
  quest: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  unlocked_not_achieved: TrailParticipant[] | null;
  unlocked_and_achieved: TrailParticipant[] | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TrailRow({ trail, showPoints, isLast }: { trail: TrailParticipant; showPoints: boolean; isLast?: boolean }) {
  return (
    <View style={[styles.trailRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.trailName}>{trail.trail_name}</Text>
        <Text style={styles.trailMeta}>Unlocked: {formatDate(trail.joined_at)}</Text>
        {trail.completed_at && (
          <Text style={styles.trailMeta}>Achieved: {formatDate(trail.completed_at)}</Text>
        )}
      </View>
      <View style={styles.trailRight}>
        <Text style={styles.trailKeys}>
          {trail.keys_used} key{trail.keys_used !== 1 ? 's' : ''}
        </Text>
        {showPoints && trail.points_earned != null && (
          <Text style={styles.trailPoints}>{trail.points_earned} pts</Text>
        )}
      </View>
    </View>
  );
}

function QuestCard({ summary }: { summary: QuestSummary }) {
  const [expanded, setExpanded] = useState(false);
  const { quest } = summary;
  const unlocked_not_achieved = summary.unlocked_not_achieved ?? [];
  const unlocked_and_achieved = summary.unlocked_and_achieved ?? [];

  return (
    <View style={styles.questCard}>
      <TouchableOpacity
        style={styles.questHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDates}>
            {formatDate(quest.start_date)} – {formatDate(quest.end_date)}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9AA0A6" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.questBody}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="hourglass-outline" size={15} color="#F59E0B" />
              <Text style={styles.sectionLabel}>Unlocked — Not Achieved</Text>
            </View>
            {unlocked_not_achieved.length === 0 ? (
              <Text style={styles.sectionEmpty}>No trails pending.</Text>
            ) : (
              unlocked_not_achieved.map((t, i) => (
                <TrailRow key={t.id} trail={t} showPoints={false} isLast={i === unlocked_not_achieved.length - 1} />
              ))
            )}
          </View>

          <View style={[styles.sectionBlock, { marginBottom: 0 }]}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#22C55E" />
              <Text style={styles.sectionLabel}>Unlocked & Achieved</Text>
            </View>
            {unlocked_and_achieved.length === 0 ? (
              <Text style={styles.sectionEmpty}>No trails achieved yet.</Text>
            ) : (
              unlocked_and_achieved.map((t, i) => (
                <TrailRow key={t.id} trail={t} showPoints isLast={i === unlocked_and_achieved.length - 1} />
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function KeyUsageScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<QuestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) { setLoading(false); return; }

        const { data, error } = await supabase.rpc('get_user_quests_summary', {
          p_user_id: userId,
        });
        if (!error && data) setSummary(data as QuestSummary[]);
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
        <Text style={styles.topBarTitle}>Key Usage & Trail Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {summary.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="key-outline" size={48} color="#C0C0C0" />
              <Text style={styles.emptyTitle}>No Quest Participation Yet</Text>
              <Text style={styles.emptyText}>
                Join a quest and start unlocking trails to see your progress here.
              </Text>
            </View>
          ) : (
            summary.map(s => <QuestCard key={s.quest.id} summary={s} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  emptyText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },

  questCard: {
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
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  questTitle: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey, marginBottom: 2 },
  questDates: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#9AA0A6' },

  questBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },

  sectionBlock: { marginBottom: 16 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionEmpty: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    paddingLeft: 4,
  },

  trailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  trailName: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey, marginBottom: 2 },
  trailMeta: { fontFamily: Fonts.firaSansRegular, fontSize: 11, color: '#9AA0A6' },
  trailRight: { alignItems: 'flex-end', paddingLeft: 8 },
  trailKeys: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: Colors.blueGrey },
  trailPoints: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: Colors.orange, marginTop: 2 },
});
