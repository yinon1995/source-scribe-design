import { Placement } from "./types";

export type Row =
    | { kind: "full"; blockId: string }
    | { kind: "split"; leftId?: string; rightId?: string };

/**
 * Builds rows from an ordered list of IDs and their placements.
 * Logic:
 * - Iterate through ordered IDs.
 * - If placement is 'full', flush current split row (if any) and add full row.
 * - If placement is 'left' or 'right', try to fit into current split row.
 * - Flush split row if slot is already taken.
 */
export function buildRows(
    ids: string[],
    getPlacement: (id: string) => Placement
): Row[] {
    const rows: Row[] = [];
    let split: { leftId?: string; rightId?: string } | null = null;

    const flush = () => {
        if (split) {
            if (split.leftId || split.rightId) {
                rows.push({ kind: "split", ...split });
            }
            split = null;
        }
    };

    for (const id of ids) {
        const p = getPlacement(id);

        if (p === "full") {
            flush();
            rows.push({ kind: "full", blockId: id });
            continue;
        }

        if (!split) split = {};

        if (p === "left") {
            if (split.leftId) {
                // Left slot taken, must flush
                flush();
                split = { leftId: id };
            } else {
                split.leftId = id;
            }
        } else if (p === "right") {
            if (split.rightId) {
                // Right slot taken, must flush
                flush();
                split = { rightId: id };
            } else {
                split.rightId = id;
            }
        }
    }

    flush();
    return rows;
}
