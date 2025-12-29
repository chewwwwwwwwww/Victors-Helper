import type { BlockType, UUID } from "./song";

/** Data attached to a draggable item */
export interface DragItem {
  /** Type of dragged item */
  type: "block" | "newBlockTemplate";
  /** For existing blocks: the block ID */
  blockId?: UUID;
  /** For new blocks from toolbar: the block type to create */
  blockType?: BlockType;
  /** Parent section ID if dragging from within a section */
  parentSectionId?: UUID | null;
}

/** Data for a drop target zone */
export interface DropTarget {
  /** Where the drop is happening relative to target */
  position: "before" | "after" | "inside";
  /** Target block ID (the block before/after which we're dropping) */
  targetBlockId: UUID;
  /** Target parent section (null for root level) */
  targetParentId: UUID | null;
}

/** Drop zone identifier format */
export type DropZoneId = `dropzone-${DropTarget["position"]}-${UUID}`;
