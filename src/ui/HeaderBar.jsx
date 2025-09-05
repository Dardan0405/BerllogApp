import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable } from 'react-native';
import { useNavigation, DrawerActions, useTheme } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { AuthContext } from '../auth/AuthContext';

const HeaderBar = ({ options, route }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount, notifications, clearAllNotifications } = React.useContext(AuthContext);

  const title = useMemo(() => {
    if (options?.title) return options.title;
    if (route?.name === 'Home') return t('home_title');
    return route?.name || '';
  }, [options?.title, route?.name, t]);

  const toggleLang = () => setLocale(locale === 'en' ? 'sq' : 'en');

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
      <TouchableOpacity
        accessibilityLabel="Open menu"
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.iconButton}
      >
        <Ionicons name="menu" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}> 
          <Ionicons name="search" size={18} color={colors.text} />
          <TextInput
            placeholder={t('search')}
            placeholderTextColor={colors.text + '99'}
            value={search}
            onChangeText={setSearch}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
            onSubmitEditing={() => {/* hook into search if needed */}}
          />
        </View>

        <TouchableOpacity onPress={() => setNotifOpen(true)} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge} accessibilityLabel={`${unreadCount} unread`}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleLang} style={styles.iconButton}>
          <MaterialCommunityIcons name={locale === 'en' ? 'flag-outline' : 'flag-variant-outline'} size={22} color={colors.text} />
          <Text style={[styles.langText, { color: colors.text }]}>{locale === 'en' ? 'EN' : 'SQ'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNotifOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}> 
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('notifications')}</Text>
              <TouchableOpacity onPress={() => setNotifOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetBody}>
              {Array.isArray(notifications) && notifications.length > 0 ? (
                <View>
                  {notifications.slice(0, 20).map((n, idx) => (
                    <View key={n?.id ?? idx} style={{ paddingVertical: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: n?.read ? '400' : '700' }} numberOfLines={2}>
                        {n?.title || n?.message || n?.text || 'Notification'}
                      </Text>
                      {n?.created_at ? (
                        <Text style={{ color: colors.text + '99', fontSize: 12 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  <View style={{ height: 8 }} />
                  <TouchableOpacity onPress={clearAllNotifications} style={{ alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('clear_all')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: colors.text }}>{t('no_notifications')}</Text>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 6,
  },
  input: {
    minWidth: 80,
    maxWidth: 160,
    padding: 0,
  },
  langText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetBody: {
    paddingVertical: 12,
  },
});

export default HeaderBar;
