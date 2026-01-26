// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function UnknownEvent(_props: { typename: string }) {
  // Return null to hide unknown events in production
  // For debugging, uncomment the return statement below:
  // return (
  //   <TimelineEventWrapper>
  //     <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
  //       <HelpCircle className="h-4 w-4" />
  //       <span>Unknown event type: {_props.typename}</span>
  //     </div>
  //   </TimelineEventWrapper>
  // );
  return null;
}
