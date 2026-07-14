// ============================================================
// 1. Supabase 客户端初始化（直接使用 html 中提供的参数）
// ============================================================
const supabaseUrl = 'https://ivtxfwxrkdtsxsbyaaib.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dHhmd3hya2R0c3hzYnlhYWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTU4MjYsImV4cCI6MjA5OTUzMTgyNn0.sTWcrb-H58wr-HMQ4r6QeOf7j_dC6ewTcY_--dcnN2k';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ============================================================
// 2. 工具函数：获取当前用户 ID（暂用固定值，可改为 localStorage 生成）
// ============================================================
function getUserId() {
    // 生产环境应使用 Supabase Auth 的 user.id，这里使用固定 ID 方便测试
    return '00000000-0000-0000-0000-000000000001';
}

// ============================================================
// 3. 通用 CRUD 封装
// ============================================================
const TABLES = {
    workflow: 'workflow_steps',
    events: 'events',
    decisions: 'decisions',
    knowledge: 'knowledge',
    budgets: 'budgets',
    workers: 'workers'
};

/**
 * 通用查询函数
 * @param {string} table - 表名
 * @param {object} filters - 查询条件，如 { completed: true }
 * @returns {Promise<Array>}
 */
async function fetchData(table, filters = {}) {
    let query = supabase.from(table).select('*').eq('user_id', getUserId());
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * 通用插入函数
 * @param {string} table - 表名
 * @param {object} record - 要插入的数据（自动添加 user_id）
 * @returns {Promise<object>} 插入后的记录
 */
async function insertData(table, record) {
    const payload = { ...record, user_id: getUserId() };
    const { data, error } = await supabase.from(table).insert([payload]).select();
    if (error) throw error;
    return data[0];
}

/**
 * 通用更新函数
 * @param {string} table - 表名
 * @param {string} id - 记录 ID
 * @param {object} updates - 要更新的字段
 * @returns {Promise<object>} 更新后的记录
 */
async function updateData(table, id, updates) {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
}

/**
 * 通用删除函数
 * @param {string} table - 表名
 * @param {string} id - 记录 ID
 */
async function deleteData(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
}

/**
 * 清空表所有数据（谨慎使用）
 * @param {string} table - 表名
 */
async function clearTable(table) {
    const { error } = await supabase.from(table).delete().neq('user_id', 'dummy'); // 删除所有 user_id 匹配的记录
    if (error) throw error;
}

// ============================================================
// 4. 各模块专用函数
// ============================================================

// ---------- 装修流程 ----------
async function loadWorkflowSteps() {
    const data = await fetchData(TABLES.workflow);
    return data;
}

async function saveWorkflowStep(stepIndex, completed) {
    // 先查询是否已存在该 step_index
    const existing = await fetchData(TABLES.workflow, { step_index: stepIndex });
    if (existing.length > 0) {
        // 更新
        const record = existing[0];
        return await updateData(TABLES.workflow, record.id, { completed });
    } else {
        // 插入
        return await insertData(TABLES.workflow, { step_index: stepIndex, completed });
    }
}

async function toggleWorkflowStep(stepIndex) {
    const existing = await fetchData(TABLES.workflow, { step_index: stepIndex });
    const currentCompleted = existing.length > 0 ? existing[0].completed : false;
    return await saveWorkflowStep(stepIndex, !currentCompleted);
}

// ---------- 排期日历 ----------
async function loadEvents() {
    return await fetchData(TABLES.events);
}

async function addEvent(eventData) {
    return await insertData(TABLES.events, eventData);
}

async function updateEvent(id, updates) {
    return await updateData(TABLES.events, id, updates);
}

async function deleteEvent(id) {
    return await deleteData(TABLES.events, id);
}

// ---------- 决策助手 ----------
async function loadDecisions() {
    return await fetchData(TABLES.decisions);
}

async function addDecision(decisionData) {
    return await insertData(TABLES.decisions, decisionData);
}

async function updateDecision(id, updates) {
    return await updateData(TABLES.decisions, id, updates);
}

async function deleteDecision(id) {
    return await deleteData(TABLES.decisions, id);
}

// ---------- 知识学习 ----------
async function loadKnowledge() {
    return await fetchData(TABLES.knowledge);
}

async function addKnowledge(knowledgeData) {
    return await insertData(TABLES.knowledge, knowledgeData);
}

async function updateKnowledge(id, updates) {
    return await updateData(TABLES.knowledge, id, updates);
}

async function deleteKnowledge(id) {
    return await deleteData(TABLES.knowledge, id);
}

// ---------- 预算管理 ----------
async function loadBudgets() {
    return await fetchData(TABLES.budgets);
}

async function addBudget(budgetData) {
    return await insertData(TABLES.budgets, budgetData);
}

async function updateBudget(id, updates) {
    return await updateData(TABLES.budgets, id, updates);
}

async function deleteBudget(id) {
    return await deleteData(TABLES.budgets, id);
}

// ---------- 工人管理 ----------
async function loadWorkers() {
    return await fetchData(TABLES.workers);
}

async function addWorker(workerData) {
    return await insertData(TABLES.workers, workerData);
}

async function updateWorker(id, updates) {
    return await updateData(TABLES.workers, id, updates);
}

async function deleteWorker(id) {
    return await deleteData(TABLES.workers, id);
}

// ============================================================
// 5. 备份 / 导入 / 清除全部数据
// ============================================================

/**
 * 备份所有数据（导出为 JSON 文件）
 */
async function backupAllData() {
    try {
        const tables = Object.values(TABLES);
        const allData = {};
        for (const table of tables) {
            const data = await fetchData(table);
            allData[table] = data;
        }
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('备份成功！');
    } catch (e) {
        alert('备份失败：' + e.message);
        console.error(e);
    }
}

/**
 * 导入数据（从 JSON 文件恢复）
 */
async function importAllData(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        // 清空现有数据（先删后插）
        for (const table of Object.values(TABLES)) {
            await clearTable(table);
        }
        for (const [table, rows] of Object.entries(data)) {
            if (!Object.values(TABLES).includes(table)) continue;
            for (const row of rows) {
                // 移除 id 和 user_id，让数据库自动生成
                delete row.id;
                delete row.user_id;
                await insertData(table, row);
            }
        }
        alert('导入成功！请刷新页面查看。');
        location.reload();
    } catch (e) {
        alert('导入失败：' + e.message);
        console.error(e);
    }
}

/**
 * 清除全部数据
 */
async function clearAllData() {
    if (!confirm('确定要清除所有数据吗？此操作不可撤销！')) return;
    try {
        for (const table of Object.values(TABLES)) {
            await clearTable(table);
        }
        alert('所有数据已清除！');
        location.reload();
    } catch (e) {
        alert('清除失败：' + e.message);
        console.error(e);
    }
}

// ============================================================
// 6. 界面渲染函数（示例，需根据实际 DOM 调整）
// ============================================================

/**
 * 渲染工作流步骤（示例）
 */
async function renderWorkflow() {
    const steps = await loadWorkflowSteps();
    const container = document.querySelector('#workflow-list'); // 请根据实际 id 修改
    if (!container) return;
    container.innerHTML = steps.map(step =>
        `<div class="workflow-step" data-index="${step.step_index}">
            <input type="checkbox" ${step.completed ? 'checked' : ''} onchange="toggleWorkflowStep(${step.step_index})">
            <span>步骤 ${step.step_index + 1}</span>
        </div>`
    ).join('');
    // 更新徽章
    const done = steps.filter(s => s.completed).length;
    const badge = document.querySelector('#workflow-badge');
    if (badge) badge.textContent = `${done}/9`;
}

// 其他模块的渲染函数类似，可参考上述模式实现。

// ============================================================
// 7. 全局暴露函数（供 HTML onclick 调用）
// ============================================================
window.loadWorkflowSteps = loadWorkflowSteps;
window.saveWorkflowStep = saveWorkflowStep;
window.toggleWorkflowStep = toggleWorkflowStep;
window.loadEvents = loadEvents;
window.addEvent = addEvent;
window.updateEvent = updateEvent;
window.deleteEvent = deleteEvent;
window.loadDecisions = loadDecisions;
window.addDecision = addDecision;
window.updateDecision = updateDecision;
window.deleteDecision = deleteDecision;
window.loadKnowledge = loadKnowledge;
window.addKnowledge = addKnowledge;
window.updateKnowledge = updateKnowledge;
window.deleteKnowledge = deleteKnowledge;
window.loadBudgets = loadBudgets;
window.addBudget = addBudget;
window.updateBudget = updateBudget;
window.deleteBudget = deleteBudget;
window.loadWorkers = loadWorkers;
window.addWorker = addWorker;
window.updateWorker = updateWorker;
window.deleteWorker = deleteWorker;
window.backupAllData = backupAllData;
window.importAllData = importAllData;
window.clearAllData = clearAllData;

// ============================================================
// 8. 页面加载自动初始化
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    // 渲染各个模块（请根据实际 DOM 调整）
    await renderWorkflow();
    // 可继续调用 renderEvents(), renderDecisions() 等

    // 绑定按钮事件（如果不想用 onclick，可在此绑定）
    document.querySelector('#btn-backup-data')?.addEventListener('click', backupAllData);
    document.querySelector('#btn-import-data')?.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                importAllData(e.target.files[0]);
            }
        };
        input.click();
    });
    document.querySelector('#btn-clear-data')?.addEventListener('click', clearAllData);
});

// ============================================================
// 9. 其他辅助函数（可按需添加）
// ============================================================
console.log('✅ script.js 已加载，Supabase 已就绪。');