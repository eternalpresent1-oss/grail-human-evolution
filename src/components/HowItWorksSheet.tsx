import { type ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ModalSheet } from '@/components/ModalSheet';
import { ActionButton } from '@/components/ui/ActionButton';
import { type TranslationKey } from '@/i18n';
import { useTranslator } from '@/i18n/TranslatorProvider';
import { colors, space, typography } from '@/theme';

const SECTIONS: readonly { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'guide.day.title', body: 'guide.day.body' },
  { title: 'guide.life.title', body: 'guide.life.body' },
  { title: 'guide.shadow.title', body: 'guide.shadow.body' },
  { title: 'guide.discipline.title', body: 'guide.discipline.body' },
  { title: 'guide.goal.title', body: 'guide.goal.body' },
  { title: 'guide.grail.title', body: 'guide.grail.body' },
  { title: 'guide.analysis.title', body: 'guide.analysis.body' },
  { title: 'guide.atoms.title', body: 'guide.atoms.body' },
  { title: 'guide.aim.title', body: 'guide.aim.body' },
];

export function HowItWorksSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): ReactElement {
  const t = useTranslator();
  const { height } = useWindowDimensions();

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('guide.title')}
      panelStyle={{ maxHeight: Math.max(420, height * 0.86) }}
    >
      <View style={styles.inner}>
        <Text style={styles.kicker}>{t('guide.kicker')}</Text>
        <Text style={styles.title}>{t('guide.title')}</Text>

        <ScrollView
          style={[styles.scroll, { maxHeight: Math.max(280, height * 0.58) }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.honesty}>{t('guide.honesty')}</Text>
          {t('guide.intro')
            .split(/\n+/)
            .map((paragraph) => paragraph.trim())
            .filter((paragraph) => paragraph.length > 0)
            .map((paragraph, index) => (
              <Text key={`intro-${index}`} style={styles.body}>
                {paragraph}
              </Text>
            ))}

          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(section.title)}</Text>
              {t(section.body)
                .split(/\n+/)
                .map((paragraph) => paragraph.trim())
                .filter((paragraph) => paragraph.length > 0)
                .map((paragraph, index) => (
                  <Text key={index} style={index === 0 ? styles.body : styles.bodyFollow}>
                    {paragraph}
                  </Text>
                ))}
            </View>
          ))}
        </ScrollView>

        <ActionButton label={t('common.close')} variant="ghost" onPress={onClose} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl - 2,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  kicker: {
    ...typography.kicker,
    color: colors.accent.goldMuted,
  },
  title: {
    ...typography.modalTitle,
    marginTop: space.xs,
    color: colors.text.ivory,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  honesty: {
    ...typography.bodyLead,
    color: colors.text.ivory,
  },
  body: {
    ...typography.body,
    marginTop: space.md,
    color: colors.text.muted,
  },
  bodyFollow: {
    ...typography.body,
    marginTop: space.sm,
    color: colors.text.muted,
  },
  section: {
    marginTop: space.xl,
  },
  sectionTitle: {
    ...typography.headingQuiet,
    color: colors.accent.gold,
  },
});
