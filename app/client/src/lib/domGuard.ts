/**
 * Global DOM guard — neutralises extension-induced React crashes app-wide.
 *
 * DOM-mutating browser extensions (Grammarly, password managers, ad blockers,
 * translators that ignore `translate="no"`) relocate or wrap the text nodes
 * React owns. When React later runs a commit and calls insertBefore/removeChild
 * with a reference node the extension has since detached, the NATIVE call throws:
 *
 *   "Failed to execute 'insertBefore' on 'Node': The node before which the new
 *    node is to be inserted is not a child of this node."
 *   "Failed to execute 'removeChild' on 'Node': The node to be removed is not a
 *    child of this node."
 *
 * A single routine state update (e.g. a Save button toggling its spinner) then
 * takes down the whole screen. Per-component fixes (wrapping text in <span>) help
 * but can never be exhaustive — one un-wrapped text node anywhere re-opens it.
 *
 * This shim makes the two operations defensive: if the reference/target node is
 * no longer a child of the expected parent, it falls back gracefully (append, or
 * no-op) instead of throwing. React re-syncs on its next commit, so the visible
 * result is correct. Battle-tested fix from facebook/react#11538 — used by many
 * production apps to survive Translate/Grammarly. Installed once, before mount.
 *
 * Cost: one `parentNode` identity check per insert/remove. Negligible.
 */
let warned = false;

export function installDomGuard(): void {
  if (typeof Node !== 'function' || !Node.prototype) return;
  const proto = Node.prototype as Node & { __ctDomGuard?: boolean };
  if (proto.__ctDomGuard) return;
  proto.__ctDomGuard = true;

  const realInsertBefore = proto.insertBefore;
  proto.insertBefore = function (this: Node, newNode: Node, referenceNode: Node | null) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (!warned) {
        warned = true;
        // One-time breadcrumb: a DOM extension desynced React's tree. Recovered.
        console.warn('[domGuard] insertBefore reference node detached by an extension — recovered (appended).');
      }
      // Extension moved/removed the anchor. Append instead of crashing; React
      // re-orders correctly on its next render.
      return realInsertBefore.call(this, newNode, null);
    }
    return realInsertBefore.call(this, newNode, referenceNode);
  } as typeof proto.insertBefore;

  const realRemoveChild = proto.removeChild;
  proto.removeChild = function (this: Node, child: Node) {
    if (child.parentNode !== this) {
      if (!warned) {
        warned = true;
        console.warn('[domGuard] removeChild target already detached by an extension — recovered (no-op).');
      }
      // Already detached by the extension — nothing to remove.
      return child;
    }
    return realRemoveChild.call(this, child);
  } as typeof proto.removeChild;
}
