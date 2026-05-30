import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { GoldButton } from '@/components/ui/GoldButton';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldInput } from '@/components/ui/GoldInput';
import {
  listSeoPages,
  resetSeoPage,
  updateSeoPage,
} from '@/lib/api/seo-pages';
import { ApiError } from '@/lib/api/client';
import type {
  SeoIssue,
  SeoPageAdminRow,
  SeoPageEffective,
} from '@/types/seo-pages';

interface Draft {
  row: SeoPageAdminRow;
  titleText: string;
  descriptionText: string;
  h1Text: string;
  introText: string;
  keywordsText: string;
  noindex: boolean;
  notesText: string;
  open: boolean;
  saving: boolean;
}

function toDraft(row: SeoPageAdminRow, open = false): Draft {
  const e = row.effective;
  return {
    row,
    titleText: e.title,
    descriptionText: e.description,
    h1Text: e.h1,
    introText: e.intro,
    keywordsText: e.keywords.join(', '),
    noindex: e.noindex,
    notesText: row.override?.notes ?? '',
    open,
    saving: false,
  };
}

function gradeColor(grade: SeoPageAdminRow['health']['grade']): string {
  switch (grade) {
    case 'A':
      return 'text-green-400';
    case 'B':
      return 'text-emerald-400';
    case 'C':
      return 'text-amber-400';
    case 'D':
      return 'text-orange-400';
    case 'F':
      return 'text-red-400';
  }
}

function severityColor(sev: SeoIssue['severity']): string {
  return sev === 'error' ? 'text-red-400' : sev === 'warning' ? 'text-amber-400' : 'text-text-dim';
}

function buildEffectivePreview(d: Draft): SeoPageEffective {
  // Used only for character-count hints; mirrors backend merge behaviour.
  return {
    path: d.row.effective.path,
    label: d.row.effective.label,
    title: d.titleText.trim() || d.row.defaults.title,
    description: d.descriptionText.trim() || d.row.defaults.description,
    h1: d.h1Text.trim() || d.row.defaults.h1,
    intro: d.introText.trim() || d.row.defaults.intro,
    keywords:
      d.keywordsText.trim().length > 0
        ? d.keywordsText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
        : d.row.defaults.keywords,
    noindex: d.noindex,
  };
}

export function SeoPagesPanel(): React.JSX.Element {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    try {
      const res = await listSeoPages();
      setRows(res.pages.map((p) => toDraft(p)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load SEO pages');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const sorted = useMemo(() => {
    if (!rows) return null;
    return [...rows].sort((a, b) => a.row.health.score - b.row.health.score);
  }, [rows]);

  const update = (path: string, patch: Partial<Draft>): void => {
    setRows((prev) =>
      prev?.map((r) => (r.row.effective.path === path ? { ...r, ...patch } : r)) ?? prev,
    );
  };

  const applySuggestion = (path: string, issue: SeoIssue): void => {
    if (!issue.suggested) return;
    if (issue.field === 'title') update(path, { titleText: issue.suggested });
    else if (issue.field === 'description') update(path, { descriptionText: issue.suggested });
    else if (issue.field === 'h1') update(path, { h1Text: issue.suggested });
    else if (issue.field === 'intro') update(path, { introText: issue.suggested });
  };

  const saveRow = async (d: Draft): Promise<void> => {
    update(d.row.effective.path, { saving: true });
    try {
      const keywords = d.keywordsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const res = await updateSeoPage(d.row.effective.path, {
        title: d.titleText.trim() || null,
        description: d.descriptionText.trim() || null,
        h1: d.h1Text.trim() || null,
        intro: d.introText.trim() || null,
        keywords,
        noindex: d.noindex,
        notes: d.notesText.trim() || null,
      });
      setRows((prev) =>
        prev?.map((r) =>
          r.row.effective.path === res.page.effective.path ? toDraft(res.page, true) : r,
        ) ?? prev,
      );
      Alert.alert('Saved', `${res.page.effective.label} — health ${res.page.health.grade} (${res.page.health.score}/100).`);
    } catch (e) {
      Alert.alert('Could not save', e instanceof ApiError ? e.message : 'Unknown error');
      update(d.row.effective.path, { saving: false });
    }
  };

  const resetRow = (d: Draft): void => {
    Alert.alert(
      'Reset to defaults',
      `Discard admin overrides for "${d.row.effective.label}"? The page will revert to the in-code defaults.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            update(d.row.effective.path, { saving: true });
            try {
              const res = await resetSeoPage(d.row.effective.path);
              setRows((prev) =>
                prev?.map((r) =>
                  r.row.effective.path === res.page.effective.path ? toDraft(res.page, true) : r,
                ) ?? prev,
              );
            } catch (e) {
              Alert.alert('Could not reset', e instanceof ApiError ? e.message : 'Unknown error');
              update(d.row.effective.path, { saving: false });
            }
          },
        },
      ],
    );
  };

  return (
    <GoldCard className="mb-3">
      <Text className="text-text font-semibold mb-1">SEO pages</Text>
      <Text className="text-text-dim text-xs mb-3">
        Edit title, description, H1, intro and keywords for each public landing page. Each
        page is scored 0–100 with recommended fixes; tap a suggestion to one-click apply it.
        Changes go live within 60 seconds.
      </Text>
      {error ? <Text className="text-danger text-xs mb-2">{error}</Text> : null}

      {!sorted ? (
        <Text className="text-text-muted">Loading…</Text>
      ) : sorted.length === 0 ? (
        <Text className="text-text-muted">No SEO pages registered.</Text>
      ) : (
        sorted.map((d) => {
          const preview = buildEffectivePreview(d);
          return (
            <View
              key={d.row.effective.path}
              className="border border-border rounded-lg p-3 mb-2 bg-bg-elevated"
            >
              <Pressable onPress={() => update(d.row.effective.path, { open: !d.open })}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-text font-semibold">{d.row.effective.label}</Text>
                    <Text className="text-text-dim text-xs">{d.row.effective.path}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-semibold ${gradeColor(d.row.health.grade)}`}>
                      {d.row.health.grade} · {d.row.health.score}/100
                    </Text>
                    <Text className="text-text-dim text-[10px]">
                      {d.row.health.issues.length} issue{d.row.health.issues.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {d.open ? (
                <View className="mt-3">
                  {d.row.health.issues.length > 0 ? (
                    <View className="mb-3 p-2 border border-border rounded-md">
                      <Text className="text-text-dim text-xs mb-1">Recommendations</Text>
                      {d.row.health.issues.map((iss, idx) => (
                        <View
                          key={`${iss.field}-${idx}`}
                          className="flex-row items-start justify-between py-1"
                        >
                          <View className="flex-1 pr-2">
                            <Text className={`text-xs font-semibold ${severityColor(iss.severity)}`}>
                              {iss.severity.toUpperCase()} · {iss.field}
                            </Text>
                            <Text className="text-text text-xs">{iss.message}</Text>
                          </View>
                          {iss.suggested ? (
                            <Pressable
                              onPress={() => applySuggestion(d.row.effective.path, iss)}
                              className="px-2 py-1 border border-border rounded"
                            >
                              <Text className="text-xs text-text">Apply</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-text-dim text-xs mb-2">No issues detected.</Text>
                  )}

                  <GoldInput
                    label={`Title (${preview.title.length} chars, target 30–60)`}
                    value={d.titleText}
                    onChangeText={(v) => update(d.row.effective.path, { titleText: v })}
                  />
                  <GoldInput
                    label={`Meta description (${preview.description.length} chars, target 120–170)`}
                    value={d.descriptionText}
                    onChangeText={(v) => update(d.row.effective.path, { descriptionText: v })}
                    multiline
                  />
                  <GoldInput
                    label={`On-page H1 (${preview.h1.length} chars)`}
                    value={d.h1Text}
                    onChangeText={(v) => update(d.row.effective.path, { h1Text: v })}
                  />
                  <GoldInput
                    label={`Hero intro paragraph (${preview.intro.length} chars)`}
                    value={d.introText}
                    onChangeText={(v) => update(d.row.effective.path, { introText: v })}
                    multiline
                  />
                  <GoldInput
                    label="Keywords (comma-separated)"
                    value={d.keywordsText}
                    onChangeText={(v) => update(d.row.effective.path, { keywordsText: v })}
                    autoCapitalize="none"
                    multiline
                  />
                  <View className="flex-row items-center justify-between my-2">
                    <View className="flex-1 pr-3">
                      <Text className="text-text">Noindex (hide from Google)</Text>
                      <Text className="text-text-dim text-xs">
                        Turn on only when the page should not appear in search.
                      </Text>
                    </View>
                    <Switch
                      value={d.noindex}
                      onValueChange={(v) => update(d.row.effective.path, { noindex: v })}
                    />
                  </View>
                  <GoldInput
                    label="Internal admin notes (optional)"
                    value={d.notesText}
                    onChangeText={(v) => update(d.row.effective.path, { notesText: v })}
                    multiline
                  />
                  <View className="flex-row mt-2">
                    <View className="flex-1 pr-2">
                      <GoldButton
                        label={d.saving ? 'Saving…' : 'Save SEO'}
                        onPress={() => saveRow(d)}
                        disabled={d.saving}
                      />
                    </View>
                    <View className="flex-1 pl-2">
                      <GoldButton
                        label="Reset to defaults"
                        onPress={() => resetRow(d)}
                        disabled={d.saving}
                        variant="secondary"
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </GoldCard>
  );
}
