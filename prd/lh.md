PRD Prompt
Title: “Toggleable Letterhead with Editable Registration Details”

1. Objective
Allow the user to optionally display and edit a letterhead at the top of their document. This letterhead is composed of the user’s business information (logo, entity name, address, etc.) and can be turned on or off via a sidebar checkbox. The letterhead content is stored and updated separately from the main document content, but still uses Tiptap for editing.

2. Key Features

Database Columns
header_content (text, MD format)
display_header (boolean)
Sidebar Checkbox
“Show Letterhead”
Toggles display_header in the DB and triggers re-render in the editor.
Editable Header
Insert an editable Markdown block for the letterhead above the main doc content.
Changes are saved to header_content.
Auto-Population
Pull user’s info from registrations (logo, entity name, address).
Insert a default letterhead if one doesn’t exist.
Image Handling
Use Tiptap Image extension to display the user’s logo.
The user can remove/replace the logo if desired.
3. User Flow

User opens a document in the editor.
The system fetches display_header and header_content.
If display_header === true, letterhead block is displayed at the top.
User can edit or remove any part of the letterhead text (including the logo reference).
Toggling the checkbox sets display_header = true or false.
The system updates the DB accordingly.
Saving occurs automatically (or on user actions), ensuring header_content and display_header are always in sync.
4. Success Criteria

The letterhead appears or disappears based on the checkbox state.
The user can fully edit and format letterhead text via Tiptap.
The user’s logo and business info can be loaded into the letterhead by default.
The user can hide the letterhead if they do not want a branded heading.
5. Technical Dependencies

Tiptap Editor with Image extension.
Database migrations to add header_content and display_header columns.
Updates to Document fetch/save logic to handle new columns.
Changes to the Sidebar component to include the new toggle.
6. Timeline & Milestones

DB Migration – Add columns, test defaults.
Backend Changes – Update queries to include new columns.
Editor/Sidebar – Implement the checkbox in the Sidebar, handle letterhead block in the Tiptap editor.
Styling & Testing – Ensure letterhead is separate from main content, confirm correct save behavior.
7. Out of Scope

No advanced letterhead templates beyond basic Markdown with a possible image.
No dynamic auto-filling of placeholders beyond the user’s stored registration data.
8. Assumptions

User has a single registration record to pull letterhead details from.
The user may choose to manually override or remove these details in the letterhead text.