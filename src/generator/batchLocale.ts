export const BATCH_LOCALE_IDS = ["ja", "en"] as const;

export type BatchLocaleId = (typeof BATCH_LOCALE_IDS)[number];

interface BatchFields {
  readonly tool: string;
  readonly description: string;
  readonly count: string;
  readonly page: string;
  readonly name: string;
  readonly group: string;
  readonly key: string;
  readonly value: string;
  readonly operation: string;
  readonly data: string;
  readonly risk: string;
  readonly log: string;
}

interface BatchSections {
  readonly profile: string;
  readonly tweaks: string;
  readonly actions: string;
  readonly target: string;
  readonly safety: string;
  readonly confirmation: string;
  readonly result: string;
}

interface BatchActions {
  readonly applyAll: string;
  readonly restoreAll: string;
  readonly restorePoint: string;
  readonly language: string;
  readonly next: string;
  readonly previous: string;
  readonly quit: string;
  readonly applyOne: string;
  readonly restoreOne: string;
  readonly back: string;
}

interface BatchMessages {
  readonly defaultValue: string;
  readonly deleteValue: string;
  readonly backupNotice: string;
  readonly selectAction: string;
  readonly applyAllTitle: string;
  readonly applyAllDescription: string;
  readonly applyAllPrompt: string;
  readonly applyAllSuccess: string;
  readonly applyAllFailure: string;
  readonly restoreAllTitle: string;
  readonly restoreAllDescription: string;
  readonly restoreAllPrompt: string;
  readonly restoreAllSuccess: string;
  readonly restoreAllFailure: string;
  readonly restorePointTitle: string;
  readonly restorePointDescription: string;
  readonly restorePointPrompt: string;
  readonly restorePointSuccess: string;
  readonly restorePointFailure: string;
  readonly returnPrompt: string;
  readonly exitPrompt: string;
  readonly administratorRequired: string;
  readonly elevationFailed: string;
  readonly stateDirectoryFailed: string;
  readonly engineFailed: string;
  readonly engineRestorePointCreated: string;
  readonly engineApplyCompleted: string;
  readonly engineRestoreCompleted: string;
  readonly engineError: string;
}

export interface BatchLocaleCopy {
  readonly id: BatchLocaleId;
  readonly name: string;
  readonly fields: BatchFields;
  readonly sections: BatchSections;
  readonly actions: BatchActions;
  readonly messages: BatchMessages;
  readonly risk: Readonly<Record<"low" | "medium" | "high", string>>;
  readonly operation: Readonly<Record<"set" | "delete", string>>;
  readonly readyText: (count: number) => string;
  readonly pageText: (current: number, total: number) => string;
}

export const BATCH_COPY: Readonly<Record<BatchLocaleId, BatchLocaleCopy>> = {
  ja: {
    id: "ja",
    name: "日本語",
    fields: {
      tool: "ツール",
      description: "説明",
      count: "登録数",
      page: "ページ",
      name: "Tweak名",
      group: "グループ",
      key: "キー",
      value: "値",
      operation: "操作",
      data: "データ",
      risk: "注意度",
      log: "ログ",
    },
    sections: {
      profile: "プロファイル",
      tweaks: "TWEAK一覧",
      actions: "操作",
      target: "対象レジストリ",
      safety: "安全情報",
      confirmation: "実行前の確認",
      result: "実行結果",
    },
    actions: {
      applyAll: "すべてのTweakを適用",
      restoreAll: "保存済みの値をすべて復元",
      restorePoint: "Windows復元ポイントを作成",
      language: "表示言語を変更",
      next: "次のページ",
      previous: "前のページ",
      quit: "終了",
      applyOne: "このTweakを適用",
      restoreOne: "このTweakを復元",
      back: "一覧へ戻る",
    },
    messages: {
      defaultValue: "(既定)",
      deleteValue: "値を削除",
      backupNotice: "適用前の値は初回実行時に自動保存されます。",
      selectAction: "操作を選択 > ",
      applyAllTitle: "すべてのTweakを適用",
      applyAllDescription: "各値をバックアップしてから、登録順に適用します。",
      applyAllPrompt: "すべて適用しますか？ [Y] 実行 / [N] 戻る > ",
      applyAllSuccess: "[OK] すべてのTweakを適用しました。",
      applyAllFailure: "[ERROR] 一部のTweakを適用できませんでした。",
      restoreAllTitle: "保存済みの値をすべて復元",
      restoreAllDescription: "検証済みのバックアップがある値だけを逆順に復元します。",
      restoreAllPrompt: "復元しますか？ [Y] 実行 / [N] 戻る > ",
      restoreAllSuccess: "[OK] 利用可能なバックアップを復元しました。",
      restoreAllFailure: "[ERROR] 一部の値を復元できませんでした。",
      restorePointTitle: "Windows復元ポイントを作成",
      restorePointDescription: "システムの保護が無効な場合、Windowsが作成を拒否します。",
      restorePointPrompt: "作成しますか？ [Y] 実行 / [N] 戻る > ",
      restorePointSuccess: "[OK] 復元ポイントを作成しました。",
      restorePointFailure: "[ERROR] 復元ポイントを作成できませんでした。",
      returnPrompt: "何かキーを押すと一覧へ戻ります...",
      exitPrompt: "何かキーを押すと終了します...",
      administratorRequired: "[INFO] 続行するには管理者の許可が必要です。",
      elevationFailed: "[ERROR] 管理者の許可がキャンセルされたか、昇格に失敗しました。",
      stateDirectoryFailed: "[ERROR] バックアップ用フォルダーを作成できませんでした。",
      engineFailed: "[ERROR] 内部処理エンジンを準備できませんでした。",
      engineRestorePointCreated: "[OK] 復元ポイントを作成しました。",
      engineApplyCompleted: "[OK] 適用完了",
      engineRestoreCompleted: "[OK] 復元完了",
      engineError: "[ERROR] 技術情報",
    },
    risk: { low: "低", medium: "中", high: "高" },
    operation: { set: "設定", delete: "削除" },
    readyText: (count) => `${count}件のTweakを利用できます`,
    pageText: (current, total) => `${current} / ${total}`,
  },
  en: {
    id: "en",
    name: "English",
    fields: {
      tool: "TOOL",
      description: "DESCRIPTION",
      count: "TWEAKS",
      page: "PAGE",
      name: "TWEAK",
      group: "GROUP",
      key: "KEY",
      value: "VALUE",
      operation: "ACTION",
      data: "DATA",
      risk: "RISK",
      log: "LOG",
    },
    sections: {
      profile: "PROFILE",
      tweaks: "TWEAK LIST",
      actions: "ACTIONS",
      target: "REGISTRY TARGET",
      safety: "SAFETY",
      confirmation: "CONFIRM ACTION",
      result: "RESULT",
    },
    actions: {
      applyAll: "Apply every tweak",
      restoreAll: "Restore all saved values",
      restorePoint: "Create a Windows restore point",
      language: "Change display language",
      next: "Next page",
      previous: "Previous page",
      quit: "Exit",
      applyOne: "Apply this tweak",
      restoreOne: "Restore this tweak",
      back: "Back to list",
    },
    messages: {
      defaultValue: "(Default)",
      deleteValue: "Delete value",
      backupNotice: "The original value is saved automatically on first apply.",
      selectAction: "SELECT ACTION > ",
      applyAllTitle: "Apply every tweak",
      applyAllDescription: "Back up each value, then apply the tweaks in list order.",
      applyAllPrompt: "Apply all tweaks? [Y] Apply / [N] Back > ",
      applyAllSuccess: "[OK] Every tweak was applied.",
      applyAllFailure: "[ERROR] One or more tweaks could not be applied.",
      restoreAllTitle: "Restore all saved values",
      restoreAllDescription: "Restore only validated backups, in reverse order.",
      restoreAllPrompt: "Restore saved values? [Y] Restore / [N] Back > ",
      restoreAllSuccess: "[OK] Every available backup was restored.",
      restoreAllFailure: "[ERROR] One or more values could not be restored.",
      restorePointTitle: "Create a Windows restore point",
      restorePointDescription: "Windows will reject this when System Protection is disabled.",
      restorePointPrompt: "Create a restore point? [Y] Create / [N] Back > ",
      restorePointSuccess: "[OK] The restore point was created.",
      restorePointFailure: "[ERROR] The restore point could not be created.",
      returnPrompt: "Press any key to return to the list...",
      exitPrompt: "Press any key to exit...",
      administratorRequired: "[INFO] Administrator approval is required to continue.",
      elevationFailed: "[ERROR] Administrator approval was cancelled or elevation failed.",
      stateDirectoryFailed: "[ERROR] The backup directory could not be created.",
      engineFailed: "[ERROR] The internal action engine could not be prepared.",
      engineRestorePointCreated: "[OK] Restore point created.",
      engineApplyCompleted: "[OK] Apply completed",
      engineRestoreCompleted: "[OK] Restore completed",
      engineError: "[ERROR] Technical details",
    },
    risk: { low: "LOW", medium: "MEDIUM", high: "HIGH" },
    operation: { set: "SET", delete: "DELETE" },
    readyText: (count) => `${count} tweak${count === 1 ? "" : "s"} ready`,
    pageText: (current, total) => `${current} / ${total}`,
  },
};
