// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type { Tree, TreeNode, TreeProps } from '@wfe/components/tree'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Tree: typeof Tree
    TreeNode: TreeNode
    TreeProps: TreeProps
  }>
>
