import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useLocationBootstrap } from '@/hooks/useLocationBootstrap';
import { useMatches, useUnreadCount } from '@/hooks/useMatches';
import { api } from '@/lib/api';
import { registerForPushNotifications } from '@/services/notifications';
import { colors, fontFamily, layout, spacing } from '@/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.labelWrap}>
      <AppText variant="caption" color={focused ? 'coral' : 'text'} style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
    </View>
  );
}

const tab = (label: string, icon: IconName, activeIcon: IconName, badge?: number) => ({
  tabBarLabel: ({ focused }: { focused: boolean }) => <TabLabel label={label} focused={focused} />,
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <Icon
      name={focused ? activeIcon : icon}
      size={26}
      color={focused ? colors.coral : colors.text}
    />
  ),
  tabBarBadge: badge ? badge : undefined,
  tabBarAccessibilityLabel: label,
});

export default function TabsLayout() {
  useLocationBootstrap(true);
  const { data: matches } = useMatches();
  const unread = useUnreadCount();
  const newMatches = matches?.filter((m) => m.isNew).length ?? 0;

  useEffect(() => {
    registerForPushNotifications()
      .then((pushToken) => (pushToken ? api.updateMe({ pushToken }) : null))
      .catch(() => undefined);
  }, []);

  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarBadgeStyle: styles.badge,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="discover" options={tab('Descobrir', 'paw-outline', 'paw')} />
      <Tabs.Screen name="map" options={tab('Mapa', 'map-marker-outline', 'map-marker')} />
      <Tabs.Screen name="matches" options={tab('Matches', 'heart-outline', 'heart', newMatches)} />
      <Tabs.Screen
        name="chat"
        options={tab('Chat', 'chat-processing-outline', 'chat-processing', unread)}
      />
      <Tabs.Screen name="profile" options={tab('Perfil', 'account-outline', 'account')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: layout.tabBarHeight,
    paddingTop: spacing.sm,
    position: 'absolute',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  item: { paddingTop: spacing.xs },
  badge: { backgroundColor: colors.coral, fontFamily: fontFamily.bold, fontSize: 11 },
  labelWrap: { alignItems: 'center', gap: 4 },
  label: { fontSize: 12 },
  indicator: { width: 28, height: 3, borderRadius: 2, backgroundColor: colors.transparent },
  indicatorActive: { backgroundColor: colors.coral },
});
