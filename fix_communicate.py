import re


file_path = "C:/Users/Abhi/OneDrive/Desktop/mitosh/pro-mit/src/lib/actions/super-admin/communicate.ts"
with open(file_path, "r", encoding="utf-8") as f:
content = f(.read())

changes = 0

# 1. Fix getSchoolPerformance inverted filter
old_sp = '  const { data, error } = await supabase.\n  .from("notification_recipients")\n    .select*`\n      school_id,\n      status,\n      rating,\n      notifications!inner(school_id)\n    )\n    .not("notifications.sender_role", "neq", "super_admin");'
new_sp = '  const { data, error } = await supabase.\n   .from("notification_recipients")\n    .select``\n      school_id,\n      status,\n      rating,\n      notifications!inner(school_id, sender_role)\n    )\n    .eq("notifications.sender_role", "super_admin");'
import re


file_path = "C:/Users/Abhi/OneDrive/Desktop/mitosh/pro-mit/src/lib/actions/super-admin/communicate.ts"
with open(file_path, "r", encoding="utf-8") as f:
content = f(.read())

changes = 0

# 1. Fix getSchoolPerformance inverted filter
old_sp = '  const { data, error } = await supabase.\n  .from("notification_recipients")\n    .select`(\n      school_id,\n      status,\n      rating,\n      notifications!inner(school_id)\n    )\n    .not("notifications.sender_role", "neq", "super_admin");'

new_sp = ''  const { data, error } = await supabase.\n  .from("notification_recipients")\n    .select`(\n      school_id,\n      status,\n      rating,\n      notificationsinner(school_id, sender_role)\n    )\n    .eq("notifications.sender_role", "super_admin");'
