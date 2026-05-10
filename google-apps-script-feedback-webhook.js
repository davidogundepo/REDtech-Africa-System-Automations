/**
 * Google Apps Script Web App for REDtech Feedback Collection
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets and create a new spreadsheet (or use an existing one)
 * 2. Name it "REDtech Feedback" or whatever you prefer
 * 3. Go to Extensions > Apps Script
 * 4. Delete any default code and paste this entire script
 * 5. Click Deploy > New deployment
 * 6. Choose "Web app" as the type
 * 7. Set "Execute as" to "Me"
 * 8. Set "Who has access" to "Anyone" (this allows the Supabase function to call it)
 * 9. Click Deploy and copy the Web App URL
 * 10. Go to your Supabase project dashboard > Edge Functions > feedback-to-sheets
 * 11. Add environment variable: APPSCRIPT_WEBHOOK_URL = <your-web-app-url>
 */

function doPost(e) {
  try {
    // Parse the incoming JSON payload
    const payload = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet (or specify by ID)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // If this is the first submission, add headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Email',
        'Full Name',
        'Role',
        'Department',
        'Page',
        'Type',
        'Message'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a90e2');
      headerRange.setFontColor('#ffffff');
    }
    
    // Append the feedback data as a new row
    sheet.appendRow([
      payload.timestamp || new Date().toISOString(),
      payload.email || '',
      payload.full_name || '',
      payload.role || '',
      payload.department || '',
      payload.page || '',
      payload.type || 'feedback',
      payload.message || ''
    ]);
    
    // Auto-resize columns for better readability
    sheet.autoResizeColumns(1, 8);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Feedback recorded' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional - you can run this from the Apps Script editor to test)
function testDoPost() {
  const testPayload = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        email: 'test@redtechafrica.com',
        full_name: 'Test User',
        role: 'admin',
        department: 'Engineering',
        page: '/dashboard',
        type: 'UI Bug',
        message: 'This is a test feedback submission'
      })
    }
  };
  
  const result = doPost(testPayload);
  Logger.log(result.getContent());
}
