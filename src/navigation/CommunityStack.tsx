import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityScreen from '../screens/main/CommunityScreen';
import GroupChatScreen from '../screens/main/GroupChatScreen';
import JoinRequestsScreen from '../screens/main/JoinRequestsScreen';

export type CommunityStackParamList = {
  CommunityHub: undefined;
  GroupChat: { groupId: string; groupName: string };
  JoinRequests: { groupId: string; groupName: string };
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityHub" component={CommunityScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="JoinRequests" component={JoinRequestsScreen} />
    </Stack.Navigator>
  );
}
