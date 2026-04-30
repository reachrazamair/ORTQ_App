export function generateSubject(templateType: string, data: Record<string, any>): string {
  switch (templateType) {
    case 'group_invitation':
      return `You've been invited to join "${data.groupName}" | Off-Road Treasure Quest`;
    case 'group_join_request':
      return `New join request for "${data.groupName}" | Off-Road Treasure Quest`;
    case 'group_join_request_approved':
      return `Your request to join "${data.groupName}" has been approved | Off-Road Treasure Quest`;
    case 'group_join_request_rejected':
      return `Request to join "${data.groupName}" not approved | Off-Road Treasure Quest`;
    case 'welcome':
      return 'Welcome to Off Road Treasure Quest! Your Adventure Starts Now!';
    default:
      return data.subject || 'Notification | Off-Road Treasure Quest';
  }
}
