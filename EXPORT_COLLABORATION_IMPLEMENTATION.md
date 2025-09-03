# Export & Collaboration System Implementation Guide

## Overview

This guide documents the complete export and collaboration system implementation for SpeechWriter, fulfilling Section 8 of the project plan.

## What's Been Built

### 🚀 Export System (Section 8.1)
- ✅ **PDF Export** - Professional formatting with stage directions and timing cues
- ✅ **DOCX Export** - Editable Word documents with proper formatting  
- ✅ **Plan-Based Features** - Watermarks for Free users, clean exports for Pro/Team
- ✅ **Stage Directions** - Include `[PAUSE]`, `[EMPHASIZE]`, `[CALLBACK]` tags as formatted directions
- ✅ **Multiple Export Formats** - Speaker notes, full script, outline-only versions

### 🤝 Collaboration System (Section 8.2)
- ✅ **Secure Sharing** - Signed URLs with expiration and role-based permissions
- ✅ **Role Management** - Viewer (read-only) and Commenter (can add feedback) roles
- ✅ **Inline Comments** - Click-to-comment on any text section
- ✅ **Suggested Edits** - Track changes system for collaborative improvement
- ✅ **Comment Management** - Reply threads, resolve/unresolve, notifications

## Files Created

### Backend API Endpoints (Netlify Functions)
1. `/apps/api/functions/export-pdf.ts` - PDF generation with Puppeteer
2. `/apps/api/functions/export-docx.ts` - DOCX generation with docx library
3. `/apps/api/functions/share-create.ts` - Create secure share links
4. `/apps/api/functions/share-access.ts` - Validate and access shared content
5. `/apps/api/functions/comments.ts` - Comment CRUD operations
6. `/apps/api/functions/suggested-edits.ts` - Suggested edits management

### Frontend Components
1. `/apps/web/src/components/speeches/export-modal.tsx` - Export dialog with format options
2. `/apps/web/src/components/speeches/share-modal.tsx` - Share link management
3. `/apps/web/src/components/speeches/comments-panel.tsx` - Comment system UI
4. `/apps/web/src/components/speeches/suggested-edits-panel.tsx` - Edit suggestions UI

### UI Components Added
1. `/apps/web/src/components/ui/dialog.tsx` - Modal dialog component
2. `/apps/web/src/components/ui/switch.tsx` - Toggle switch component
3. `/apps/web/src/components/ui/radio-group.tsx` - Radio button group
4. `/apps/web/src/components/ui/select.tsx` - Dropdown select component
5. `/apps/web/src/components/ui/avatar.tsx` - User avatar component

## Required Dependencies

Add these packages to your project:

### For API Functions
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0",
    "docx": "^8.0.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### For Frontend Components  
```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-avatar": "^1.0.4",
    "lucide-react": "^0.294.0"
  }
}
```

## Integration Steps

### 1. Database Schema
The collaboration schema already exists in `/packages/database/src/schema/collaboration.ts`:
- `shareLinks` - Secure sharing functionality
- `permissions` - Direct user permissions  
- `comments` - Comment threads and replies
- `suggestedEdits` - Track change suggestions

### 2. Environment Variables
Add these to your Netlify environment:
```
JWT_SECRET=your-secure-jwt-secret-here
SITE_URL=https://aispeechwriter.netlify.app
```

### 3. Add Export Buttons to Speech Editor
```tsx
import { ExportModal } from '@/components/speeches/export-modal';

// In your speech editor component:
<ExportModal 
  speechId={speech.id} 
  speechTitle={speech.title}
  userPlan={userSubscription.plan}
>
  <Button variant="outline">
    <Download className="h-4 w-4 mr-2" />
    Export
  </Button>
</ExportModal>
```

### 4. Add Collaboration UI
```tsx
import { ShareModal } from '@/components/speeches/share-modal';
import { CommentsPanel } from '@/components/speeches/comments-panel';  
import { SuggestedEditsPanel } from '@/components/speeches/suggested-edits-panel';

// Add sharing
<ShareModal speechId={speech.id} speechTitle={speech.title} />

// Add collaboration panels (in sidebar or tabs)
<CommentsPanel 
  speechId={speech.id}
  canComment={hasCommentPermission}
  currentUserId={user.id}
  isAuthor={speech.userId === user.id}
/>

<SuggestedEditsPanel
  speechId={speech.id} 
  canSuggestEdits={hasCommentPermission}
  isAuthor={speech.userId === user.id}
  currentUserId={user.id}
/>
```

### 5. Authentication Integration  
The API endpoints are ready for auth integration. Add your auth tokens:

```typescript
// In API calls
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 6. Subscription Plan Integration
The export system checks for subscription plans to determine watermarks:

```typescript
// In export functionality
const shouldWatermark = userSubscription.plan === 'free';
```

## Key Features

### Export System
- **Professional PDF Generation**: Clean formatting with proper typography
- **Word Document Export**: Fully editable DOCX files  
- **Stage Direction Formatting**: Visual highlighting of speaking cues
- **Subscription Tiers**: Watermarked for free, clean for paid plans
- **Multiple Formats**: Speaker notes, full script, outline-only options

### Collaboration System
- **Secure Sharing**: JWT-signed URLs with expiration dates
- **Role-Based Access**: Viewer vs Commenter permissions
- **Threaded Comments**: Reply chains with resolve/unresolve functionality
- **Suggested Edits**: GitHub-style change requests with accept/reject
- **Real-time Ready**: Built for WebSocket integration

## Security Features
- **Signed Share Links**: JWT verification prevents tampering
- **Role-Based Permissions**: Granular access control
- **Expiring Links**: Time-based access limitation
- **Usage Limits**: Optional maximum uses per share link
- **Audit Trail**: Full tracking of access and changes

## Next Steps
1. **Install Dependencies**: Add the required packages
2. **Environment Setup**: Configure JWT secrets and site URL
3. **Database Migration**: Run migrations for collaboration schema
4. **UI Integration**: Add export/share buttons to speech editor
5. **Auth Integration**: Connect with existing authentication system
6. **Testing**: Test export downloads and collaboration flows

## Advanced Features (Future)
- **Real-time Collaboration**: Live cursors and simultaneous editing
- **Export Templates**: Custom branding for Team plans
- **Advanced Permissions**: Time-limited access, specific section commenting
- **Analytics**: Export tracking, collaboration metrics
- **Integrations**: Slack notifications, calendar integration

The export and collaboration systems are now complete and ready for integration! 🎉