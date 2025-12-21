import editorManager from '../services/editor-manager';

export async function processSummonEvent(event: SummonEvent, ctx: { view?: EditorView; issueId?: string; pos?: number }, opts?: Partial<SummonOptions>) {
  // Delegate to the centralized editor manager
  // Note: the manager exposes `processSummonEvent` to preserve compatibility during migration
  // and will handle the actual behavior.
  // Prefer using `editorManager` API directly going forward.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - delegate with dynamic types
  return editorManager.processSummonEvent(event, ctx, opts) as Promise<boolean>;
}
