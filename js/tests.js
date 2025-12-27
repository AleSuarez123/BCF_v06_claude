
import { filterIssuesByColumns } from './issue-manager.js';
import { openEditSidebar, openEditSidebarBulk, __getEditPanelState } from './edit-panel.js';
import { AppState } from './state.js';

// Mock data
const issues = [
    { guid: '1', title: 'Issue 1', topicStatus: 'Open', priority: 'High', topicType: 'Clash', assignedTo: 'User A', creationDate: '2023-01-01T10:00:00Z' },
    { guid: '2', title: 'Issue 2', topicStatus: 'Closed', priority: 'Low', topicType: 'Request', assignedTo: 'User B', creationDate: '2023-01-02T10:00:00Z' },
    { guid: '3', title: 'Another Issue', topicStatus: 'Open', priority: 'Medium', topicType: 'Clash', assignedTo: '', creationDate: '2023-01-03T10:00:00Z' }
];

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ${message}`);
        throw new Error(message);
    }
    console.log(`✅ ${message}`);
}

async function runTests() {
    console.log('Running tests...');

    // Test 1: No filters
    const res1 = filterIssuesByColumns(issues, {});
    assert(res1.length === 3, 'No filters should return all issues');

    // Test 2: Text filter (Title)
    const res2 = filterIssuesByColumns(issues, { title: { type: 'text', value: 'issue 1' } });
    assert(res2.length === 1 && res2[0].guid === '1', 'Text filter should match title');

    // Test 3: Select filter (Status)
    const res3 = filterIssuesByColumns(issues, { status: { type: 'select', value: ['Open'] } });
    assert(res3.length === 2, 'Select filter should match status Open');

    // Test 4: Select filter multiple (Status)
    const res4 = filterIssuesByColumns(issues, { status: { type: 'select', value: ['Open', 'Closed'] } });
    assert(res4.length === 3, 'Select filter should match multiple statuses');

    // Test 5: Select filter (Assigned Empty)
    const res5 = filterIssuesByColumns(issues, { assigned: { type: 'select', value: [''] } });
    assert(res5.length === 1 && res5[0].guid === '3', 'Select filter should match empty assigned');

    // Test 6: Date filter (From)
    const res6 = filterIssuesByColumns(issues, { date: { type: 'date', from: '2023-01-02' } });
    assert(res6.length === 2, 'Date filter should match from date');

    // Test 7: Date filter (To)
    const res7 = filterIssuesByColumns(issues, { date: { type: 'date', to: '2023-01-02' } });
    assert(res7.length === 2, 'Date filter should match to date'); // 1 and 2

    // Test 8: Date filter (Range)
    const res8 = filterIssuesByColumns(issues, { date: { type: 'date', from: '2023-01-02', to: '2023-01-02' } });
    assert(res8.length === 1 && res8[0].guid === '2', 'Date filter should match range');

    // Test 9: Combined filters
    const res9 = filterIssuesByColumns(issues, { 
        status: { type: 'select', value: ['Open'] },
        priority: { type: 'select', value: ['High'] }
    });
    assert(res9.length === 1 && res9[0].guid === '1', 'Combined filters should match both');

    AppState.currentIssues = issues.map(i => ({ ...i, labels: [], assignedTo: i.assignedTo }));
    AppState.projects = [];
    AppState.filteredIssues = [];
    openEditSidebar('1');
    const stSingle = __getEditPanelState();
    assert(stSingle.open === true && stSingle.mode === 'single', 'Edit panel opens in single mode');
    assert(stSingle.form.guid === '1', 'Edit panel loads correct GUID');

    // Panel tests: open bulk
    openEditSidebarBulk(['1', '2']);
    const stBulk = __getEditPanelState();
    assert(stBulk.open === true && stBulk.mode === 'bulk', 'Edit panel opens in bulk mode');
    assert(stBulk.selectedGuids.length === 2, 'Bulk mode tracks selected GUIDs');

    const blobIssue = { guid: 'blob1', title: 'Blob Snapshot', topicStatus: 'Open', priority: 'High', topicType: 'Clash', assignedTo: '', labels: [], snapshot: new Blob(['x'], { type: 'image/png' }) };
    AppState.currentIssues.push(blobIssue);
    openEditSidebar('blob1');
    const stBlob = __getEditPanelState();
    assert(stBlob.snapshotUrls.length === 1, 'SnapshotUrls should contain one entry for Blob snapshot');
    assert(typeof stBlob.snapshotUrls[0] === 'string' && stBlob.snapshotUrls[0].startsWith('blob:'), 'Blob snapshot should convert to object URL');

    console.log('All tests passed!');
}

runTests().catch(e => console.error(e));
