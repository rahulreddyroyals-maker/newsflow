NewsFlow v35 - Bulk reject in Admin > Pending Approval
Overwrite: src/admin/Approvals.jsx, src/services/newsService.js
Deploy: git add . && git commit -m "bulk reject" && git push ; npm run build ; firebase deploy --only hosting
(no rules change needed)
Features: checkbox per card, Select all, Reject selected, Reject all RSS/feed items, Reject ALL pending (confirm + one shared reason, audit-logged per post).
