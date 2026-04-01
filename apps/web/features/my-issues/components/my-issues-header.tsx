"use client";

import { useMemo } from "react";
import { useStore } from "zustand";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  CircleDot,
  Columns3,
  Filter,
  List,
  Plus,
  SignalHigh,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useModalStore } from "@/features/modals";
import {
  ALL_STATUSES,
  STATUS_CONFIG,
  PRIORITY_ORDER,
  PRIORITY_CONFIG,
} from "@/features/issues/config";
import { StatusIcon, PriorityIcon } from "@/features/issues/components";
import {
  SORT_OPTIONS,
  CARD_PROPERTY_OPTIONS,
} from "@/features/issues/stores/view-store";
import { filterIssues } from "@/features/issues/utils/filter";
import type { Issue } from "@/shared/types";
import { myIssuesViewStore } from "../stores/my-issues-view-store";

// ---------------------------------------------------------------------------
// HoverCheck — shadcn official pattern (PR #6862)
// ---------------------------------------------------------------------------

const FILTER_ITEM_CLASS =
  "group/fitem pr-1.5! [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden";

function HoverCheck({ checked }: { checked: boolean }) {
  return (
    <div
      className="border-input data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground pointer-events-none size-4 shrink-0 rounded-[4px] border transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100 opacity-0 group-hover/fitem:opacity-100 group-focus/fitem:opacity-100 data-[selected=true]:opacity-100"
      data-selected={checked}
    >
      <Check className="size-3.5 text-current" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActiveFilterCount(state: {
  statusFilters: string[];
  priorityFilters: string[];
}) {
  let count = 0;
  if (state.statusFilters.length > 0) count++;
  if (state.priorityFilters.length > 0) count++;
  return count;
}

function useIssueCounts(allIssues: Issue[]) {
  return useMemo(() => {
    const status = new Map<string, number>();
    const priority = new Map<string, number>();

    for (const issue of allIssues) {
      status.set(issue.status, (status.get(issue.status) ?? 0) + 1);
      priority.set(issue.priority, (priority.get(issue.priority) ?? 0) + 1);
    }

    return { status, priority };
  }, [allIssues]);
}

// ---------------------------------------------------------------------------
// MyIssuesHeader
// ---------------------------------------------------------------------------

export function MyIssuesHeader({ allIssues }: { allIssues: Issue[] }) {
  const viewMode = useStore(myIssuesViewStore, (s) => s.viewMode);
  const statusFilters = useStore(myIssuesViewStore, (s) => s.statusFilters);
  const priorityFilters = useStore(myIssuesViewStore, (s) => s.priorityFilters);
  const sortBy = useStore(myIssuesViewStore, (s) => s.sortBy);
  const sortDirection = useStore(myIssuesViewStore, (s) => s.sortDirection);
  const cardProperties = useStore(myIssuesViewStore, (s) => s.cardProperties);
  const act = myIssuesViewStore.getState();

  const counts = useIssueCounts(allIssues);

  const filteredCount = useMemo(
    () =>
      filterIssues(allIssues, {
        statusFilters,
        priorityFilters,
        assigneeFilters: [],
        includeNoAssignee: false,
        creatorFilters: [],
      }).length,
    [allIssues, statusFilters, priorityFilters],
  );

  const filterCount = getActiveFilterCount({ statusFilters, priorityFilters });

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Manual";
  const hasActiveFilters = filterCount > 0;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {viewMode === "board" ? (
                  <Columns3 className="size-3.5" />
                ) : (
                  <List className="size-3.5" />
                )}
                {viewMode === "board" ? "Board" : "List"}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-auto">
            <DropdownMenuGroup>
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => act.setViewMode("board")}>
                <Columns3 />
                Board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => act.setViewMode("list")}>
                <List />
                List
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter — DropdownMenu with sub-menus */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className={
                  hasActiveFilters ? "border-primary/50 text-primary" : ""
                }
              >
                <Filter className="size-3.5" />
                Filter
                {hasActiveFilters && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                    {filterCount}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-auto">
            {/* Status */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CircleDot className="size-3.5" />
                <span className="flex-1">Status</span>
                {statusFilters.length > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {statusFilters.length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto min-w-48">
                {ALL_STATUSES.map((s) => {
                  const checked = statusFilters.includes(s);
                  const count = counts.status.get(s) ?? 0;
                  return (
                    <DropdownMenuCheckboxItem
                      key={s}
                      checked={checked}
                      onCheckedChange={() => act.toggleStatusFilter(s)}
                      className={FILTER_ITEM_CLASS}
                    >
                      <HoverCheck checked={checked} />
                      <StatusIcon status={s} className="h-3.5 w-3.5" />
                      {STATUS_CONFIG[s].label}
                      {count > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {count} {count === 1 ? "issue" : "issues"}
                        </span>
                      )}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Priority */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SignalHigh className="size-3.5" />
                <span className="flex-1">Priority</span>
                {priorityFilters.length > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {priorityFilters.length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto min-w-44">
                {PRIORITY_ORDER.map((p) => {
                  const checked = priorityFilters.includes(p);
                  const count = counts.priority.get(p) ?? 0;
                  return (
                    <DropdownMenuCheckboxItem
                      key={p}
                      checked={checked}
                      onCheckedChange={() => act.togglePriorityFilter(p)}
                      className={FILTER_ITEM_CLASS}
                    >
                      <HoverCheck checked={checked} />
                      <PriorityIcon priority={p} />
                      {PRIORITY_CONFIG[p].label}
                      {count > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {count} {count === 1 ? "issue" : "issues"}
                        </span>
                      )}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Reset */}
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={act.clearFilters}>
                  Reset all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Display settings */}
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="size-3.5" />
                Display
              </Button>
            }
          />
          <PopoverContent align="start" className="w-64 p-0">
            <div className="border-b px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Ordering
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-between text-xs"
                      >
                        {sortLabel}
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-auto">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => act.setSortBy(opt.value)}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    act.setSortDirection(
                      sortDirection === "asc" ? "desc" : "asc",
                    )
                  }
                  title={sortDirection === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="size-3.5" />
                  ) : (
                    <ArrowDown className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Card properties
              </span>
              <div className="mt-2 space-y-2">
                {CARD_PROPERTY_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <span className="text-sm">{opt.label}</span>
                    <Switch
                      size="sm"
                      checked={cardProperties[opt.key]}
                      onCheckedChange={() => act.toggleCardProperty(opt.key)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {filteredCount} {filteredCount === 1 ? "Issue" : "Issues"}
        </span>
        <Button
          size="sm"
          onClick={() => useModalStore.getState().open("create-issue")}
        >
          <Plus />
          New Issue
        </Button>
      </div>
    </div>
  );
}
