type TimestampedItem = {
  id: string;
  createdAt: string | Date;
};

export type NewestTimelineEntry<
  Member extends TimestampedItem,
  Post extends TimestampedItem,
  Project extends TimestampedItem,
> =
  | { kind: "member"; item: Member }
  | { kind: "post"; item: Post }
  | { kind: "project"; item: Project };

function timestamp(value: string | Date) {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : 0;
}

export function mergeNewestTimeline<
  Member extends TimestampedItem,
  Post extends TimestampedItem,
  Project extends TimestampedItem,
>({
  members,
  posts,
  projects,
}: {
  members: Member[];
  posts: Post[];
  projects: Project[];
}): Array<NewestTimelineEntry<Member, Post, Project>> {
  return [
    ...members.map((item) => ({ kind: "member" as const, item })),
    ...posts.map((item) => ({ kind: "post" as const, item })),
    ...projects.map((item) => ({ kind: "project" as const, item })),
  ].sort(
    (a, b) =>
      timestamp(b.item.createdAt) - timestamp(a.item.createdAt) ||
      `${a.kind}:${a.item.id}`.localeCompare(`${b.kind}:${b.item.id}`),
  );
}
