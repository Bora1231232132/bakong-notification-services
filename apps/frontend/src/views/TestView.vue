<template>
  <div class="test-page">
    <div class="test-container">
      <h1 class="page-title">🧪 Testing Tools</h1>
      <p class="page-description">
        Test and validate FCM tokens, sync user data, and verify system functionality.
      </p>

      <el-tabs v-model="mainActiveTab" class="main-tabs">
        <!-- FCM Token Test Tab -->
        <el-tab-pane label="🔑 Test FCM Token" name="token">
          <div class="test-section">
            <h2 class="section-title">🧪 Test FCM Token</h2>
            <p class="section-description">
              Test if an FCM token is valid. This will send a test notification to verify the token.
            </p>

            <div class="platform-info-box">
              <el-icon class="info-icon"><InfoFilled /></el-icon>
              <div class="info-content">
                <strong>Platform Selection Note:</strong>
                <p>
                  In <strong>development</strong> environment, all platforms (BAKONG, BAKONG_JUNIOR,
                  BAKONG_TOURIST) use the same Firebase project. Therefore, any valid token from
                  that project will work regardless of which platform you select. In
                  <strong>production/SIT</strong>, each platform has its own Firebase project, so
                  platform selection matters.
                </p>
              </div>
            </div>

            <div class="token-input-group">
              <el-form :model="tokenTestForm" label-width="140px">
                <el-form-item label="FCM Token" required>
                  <el-input
                    v-model="tokenTestForm.token"
                    type="textarea"
                    :rows="4"
                    placeholder="Enter FCM token to test..."
                    class="token-input"
                    clearable
                    @input="handleTokenInput"
                  />
                  <div
                    v-if="!tokenTestForm.token || !tokenTestForm.token.trim()"
                    class="input-hint"
                  >
                    ⚠️ Please enter a token to enable the test button
                  </div>
                </el-form-item>
                <el-form-item label="Platform">
                  <el-select
                    v-model="tokenTestForm.bakongPlatform"
                    placeholder="Select platform (optional)"
                    clearable
                    style="width: 100%"
                  >
                    <el-option label="BAKONG" value="BAKONG" />
                    <el-option label="BAKONG_JUNIOR" value="BAKONG_JUNIOR" />
                    <el-option label="BAKONG_TOURIST" value="BAKONG_TOURIST" />
                  </el-select>
                  <div class="input-hint">
                    ℹ️ Platform selection determines which Firebase project to use (only matters in
                    production/SIT)
                  </div>
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="testingToken"
                    @click="handleTestToken"
                    :disabled="!tokenTestForm.token || !tokenTestForm.token.trim()"
                    size="large"
                    class="test-token-btn"
                  >
                    <el-icon v-if="!testingToken" style="margin-right: 8px"><Check /></el-icon>
                    {{ testingToken ? 'Testing Token...' : 'Test Token' }}
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <div v-if="tokenTestResult" class="test-result">
              <h3 class="result-title">Test Result:</h3>
              <div class="result-content">
                <div class="result-item">
                  <span class="result-label">Format Valid:</span>
                  <el-tag :type="tokenTestResult.formatValid ? 'success' : 'danger'">
                    {{ tokenTestResult.formatValid ? '✅ Yes' : '❌ No' }}
                  </el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Firebase Valid:</span>
                  <el-tag :type="tokenTestResult.firebaseValid ? 'success' : 'danger'">
                    {{ tokenTestResult.firebaseValid ? '✅ Yes' : '❌ No' }}
                  </el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Overall Status:</span>
                  <el-tag :type="tokenTestResult.isValid ? 'success' : 'danger'" size="large">
                    {{ tokenTestResult.isValid ? '✅ Valid Token' : '❌ Invalid Token' }}
                  </el-tag>
                </div>
                <div v-if="tokenTestResult.messageId" class="result-item">
                  <span class="result-label">Message ID:</span>
                  <span class="result-value">{{ tokenTestResult.messageId }}</span>
                </div>
                <div v-if="tokenTestResult.error" class="result-item error-item">
                  <span class="result-label">Error:</span>
                  <span class="result-value error-text">{{ tokenTestResult.error }}</span>
                </div>
                <div v-if="tokenTestResult.errorCode" class="result-item">
                  <span class="result-label">Error Code:</span>
                  <el-tag type="warning">{{ tokenTestResult.errorCode }}</el-tag>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- User Sync Tab -->
        <el-tab-pane label="🔄 Sync All Users" name="sync">
          <div class="test-section">
            <h2 class="section-title">🔄 Sync User Data</h2>
            <p class="section-description">
              Manually sync all user data from the database. This normalizes user fields, validates
              tokens, updates platform/language information, and tracks sync status.
            </p>

            <div class="sync-info-box" style="margin-top: 20px">
              <el-icon class="info-icon"><InfoFilled /></el-icon>
              <div class="info-content">
                <strong>Sync Status Tracking:</strong>
                <p>
                  Each user sync now tracks: <code>status</code> (SUCCESS/FAILED),
                  <code>lastSyncAt</code> (timestamp), and <code>lastSyncMessage</code> (success
                  message or error details). Check the database to see syncStatus JSONB column.
                </p>
              </div>
            </div>

            <div class="sync-info-box">
              <h3 class="info-box-title">When does user sync happen automatically?</h3>
              <ul class="sync-scenarios">
                <li>
                  <strong>1. When mobile app calls API endpoints:</strong>
                  <p>
                    <strong>✅ Syncs individual user data:</strong> When mobile app calls
                    <code>/notification/send</code> or <code>/notification/inbox</code>, that
                    specific user's data (FCM token, platform, language) is synced immediately.
                  </p>
                  <p class="warning-note">
                    ⚠️ <strong>Important:</strong> If mobile app only receives FCM push
                    notifications without calling any API, user data won't be synced. The mobile app
                    must call at least one API endpoint to update their data.
                  </p>
                </li>
                <li>
                  <strong>2. When sending notifications via template:</strong>
                  <p>
                    Before sending notifications, the system automatically normalizes all existing
                    user data in the database (platform, language, token format validation). This
                    only works with data already in the database - it doesn't fetch new data from
                    external sources.
                  </p>
                </li>
                <li>
                  <strong>3. Manual sync (this page):</strong>
                  <p>
                    You can manually trigger a sync to normalize all user data, validate tokens, and
                    update platform/language fields. This also only works with existing database
                    data.
                  </p>
                </li>
              </ul>

              <div class="sync-improvement-box">
                <strong>✅ Backend Auto-Cleanup Feature:</strong>
                <p>
                  The backend now <strong>automatically cleans up invalid tokens</strong> when FCM
                  sends fail:
                </p>
                <ul class="auto-cleanup-list">
                  <li>
                    When sending notifications fails with invalid token errors, the backend
                    automatically clears those tokens
                  </li>
                  <li>
                    When syncing users, the backend automatically removes tokens that are too short
                    or malformed
                  </li>
                  <li>
                    This helps keep the database clean even if mobile apps don't call APIs
                    frequently
                  </li>
                </ul>
                <p class="note-text">
                  <strong>Note:</strong> While backend auto-cleanup helps maintain data quality,
                  mobile apps should still call <code>/notification/send</code> or
                  <code>/notification/inbox</code> to sync NEW tokens and updated user information
                  (platform, language). Backend cleanup only removes invalid tokens - it doesn't
                  fetch new data from external sources.
                </p>
              </div>
            </div>

            <div class="sync-actions">
              <el-button
                type="primary"
                :loading="syncingUsers"
                @click="handleSyncUsers"
                size="large"
                class="sync-users-btn"
              >
                <el-icon v-if="!syncingUsers" style="margin-right: 8px"><Check /></el-icon>
                {{ syncingUsers ? 'Syncing Users...' : 'Sync All Users' }}
              </el-button>
            </div>

            <div v-if="syncResult" class="test-result">
              <h3 class="result-title">Sync Result:</h3>
              <div class="result-content">
                <div class="result-item">
                  <span class="result-label">Total Users:</span>
                  <el-tag type="info">{{ syncResult.totalCount }}</el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Updated Users:</span>
                  <el-tag :type="syncResult.updatedCount > 0 ? 'success' : 'info'">
                    {{ syncResult.updatedCount }}
                  </el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Platform Updates:</span>
                  <el-tag type="warning">{{ syncResult.platformUpdates }}</el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Language Updates:</span>
                  <el-tag type="warning">{{ syncResult.languageUpdates }}</el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Invalid Tokens:</span>
                  <el-tag :type="syncResult.invalidTokens > 0 ? 'danger' : 'success'">
                    {{ syncResult.invalidTokens }}
                  </el-tag>
                </div>
                <div
                  v-if="syncResult.updatedIds && syncResult.updatedIds.length > 0"
                  class="result-item"
                >
                  <span class="result-label">Updated Account IDs:</span>
                  <div class="updated-ids-list">
                    <el-tag
                      v-for="(id, index) in syncResult.updatedIds.slice(0, 10)"
                      :key="index"
                      size="small"
                      style="margin: 2px"
                    >
                      {{ id }}
                    </el-tag>
                    <span v-if="syncResult.updatedIds.length > 10" class="more-ids">
                      ... and {{ syncResult.updatedIds.length - 10 }} more
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Inbox API Test Tab -->
        <el-tab-pane label="📬 Test Inbox API" name="inbox">
          <div class="test-section">
            <h2 class="section-title">📬 Test Inbox API</h2>
            <p class="section-description">
              Test the /inbox endpoint with two flows: Sync Data (when page/size are null) and
              Notification Center (when page/size are provided).
            </p>

            <div class="inbox-info-box">
              <h3 class="info-box-title">Two Flow Types:</h3>
              <ul class="sync-scenarios">
                <li>
                  <strong>1. Sync Data Flow:</strong>
                  <p>
                    When <code>page</code> and <code>size</code> are <code>null</code> or not
                    provided, the API syncs user data and returns a simple sync response.
                  </p>
                </li>
                <li>
                  <strong>2. Notification Center Flow:</strong>
                  <p>
                    When <code>page</code> and <code>size</code> are provided, the API returns
                    paginated notifications (existing behavior).
                  </p>
                </li>
              </ul>
            </div>

            <el-tabs v-model="inboxActiveTab" class="inbox-tabs">
              <el-tab-pane label="🔄 Sync Data Flow" name="sync">
                <div class="inbox-form-container">
                  <el-form :model="inboxSyncForm" label-width="140px">
                    <el-form-item label="Account ID" required>
                      <el-input
                        v-model="inboxSyncForm.accountId"
                        placeholder="e.g., tny_ttny@bkrt"
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="FCM Token" required>
                      <el-input
                        v-model="inboxSyncForm.fcmToken"
                        type="textarea"
                        :rows="3"
                        placeholder="Enter FCM token..."
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="Platform">
                      <el-select
                        v-model="inboxSyncForm.platform"
                        placeholder="Select platform (optional)"
                        clearable
                        style="width: 100%"
                      >
                        <el-option label="IOS" value="IOS" />
                        <el-option label="ANDROID" value="ANDROID" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Participant Code">
                      <el-input
                        v-model="inboxSyncForm.participantCode"
                        placeholder="e.g., BKRTKHPPXXX"
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="Language">
                      <el-select
                        v-model="inboxSyncForm.language"
                        placeholder="Select language (optional)"
                        clearable
                        style="width: 100%"
                      >
                        <el-option label="English (en)" value="en" />
                        <el-option label="Khmer (km)" value="km" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Bakong Platform" required>
                      <el-select
                        v-model="inboxSyncForm.bakongPlatform"
                        placeholder="Select Bakong platform"
                        style="width: 100%"
                      >
                        <el-option label="BAKONG" value="BAKONG" />
                        <el-option label="BAKONG_JUNIOR" value="BAKONG_JUNIOR" />
                        <el-option label="BAKONG_TOURIST" value="BAKONG_TOURIST" />
                      </el-select>
                    </el-form-item>
                    <el-form-item>
                      <div style="display: flex; gap: 12px">
                        <el-button
                          type="primary"
                          :loading="testingInboxSync"
                          @click="handleTestInboxSync"
                          :disabled="
                            !inboxSyncForm.accountId ||
                            !inboxSyncForm.fcmToken ||
                            !inboxSyncForm.bakongPlatform
                          "
                          size="large"
                          class="test-inbox-btn"
                        >
                          <el-icon v-if="!testingInboxSync" style="margin-right: 8px"
                            ><Check
                          /></el-icon>
                          {{ testingInboxSync ? 'Syncing...' : 'Test Sync Data Flow' }}
                        </el-button>
                        <el-button
                          type="danger"
                          :loading="testingInboxSync"
                          @click="handleTestSyncFailure"
                          :disabled="!inboxSyncForm.accountId || !inboxSyncForm.bakongPlatform"
                          size="large"
                          class="test-failure-btn"
                        >
                          <el-icon v-if="!testingInboxSync" style="margin-right: 8px"
                            ><Warning
                          /></el-icon>
                          Test Failure Scenario
                        </el-button>
                      </div>
                      <div class="input-hint" style="margin-top: 8px">
                        💡 <strong>Test Failure:</strong> Click "Test Failure Scenario" to simulate
                        a sync failure (uses invalid accountId format to trigger database error)
                      </div>
                    </el-form-item>
                  </el-form>
                </div>
              </el-tab-pane>
              <el-tab-pane label="📋 Notification Center Flow" name="notification">
                <div class="inbox-form-container">
                  <el-form :model="inboxNotificationForm" label-width="140px">
                    <el-form-item label="Account ID" required>
                      <el-input
                        v-model="inboxNotificationForm.accountId"
                        placeholder="e.g., tny_ttny@bkrt"
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="FCM Token" required>
                      <el-input
                        v-model="inboxNotificationForm.fcmToken"
                        type="textarea"
                        :rows="3"
                        placeholder="Enter FCM token..."
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="Platform">
                      <el-select
                        v-model="inboxNotificationForm.platform"
                        placeholder="Select platform (optional)"
                        clearable
                        style="width: 100%"
                      >
                        <el-option label="IOS" value="IOS" />
                        <el-option label="ANDROID" value="ANDROID" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Participant Code">
                      <el-input
                        v-model="inboxNotificationForm.participantCode"
                        placeholder="e.g., BKRTKHPPXXX"
                        clearable
                      />
                    </el-form-item>
                    <el-form-item label="Language">
                      <el-select
                        v-model="inboxNotificationForm.language"
                        placeholder="Select language (optional)"
                        clearable
                        style="width: 100%"
                      >
                        <el-option label="English (en)" value="en" />
                        <el-option label="Khmer (km)" value="km" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Bakong Platform" required>
                      <el-select
                        v-model="inboxNotificationForm.bakongPlatform"
                        placeholder="Select Bakong platform"
                        style="width: 100%"
                      >
                        <el-option label="BAKONG" value="BAKONG" />
                        <el-option label="BAKONG_JUNIOR" value="BAKONG_JUNIOR" />
                        <el-option label="BAKONG_TOURIST" value="BAKONG_TOURIST" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Page" required>
                      <el-input-number
                        v-model="inboxNotificationForm.page"
                        :min="1"
                        placeholder="Page number"
                        style="width: 100%"
                      />
                    </el-form-item>
                    <el-form-item label="Size" required>
                      <el-input-number
                        v-model="inboxNotificationForm.size"
                        :min="1"
                        :max="100"
                        placeholder="Page size"
                        style="width: 100%"
                      />
                    </el-form-item>
                    <el-form-item>
                      <el-button
                        type="primary"
                        :loading="testingInboxNotification"
                        @click="handleTestInboxNotification"
                        :disabled="
                          !inboxNotificationForm.accountId ||
                          !inboxNotificationForm.fcmToken ||
                          !inboxNotificationForm.bakongPlatform ||
                          !inboxNotificationForm.page ||
                          !inboxNotificationForm.size
                        "
                        size="large"
                        class="test-inbox-btn"
                      >
                        <el-icon v-if="!testingInboxNotification" style="margin-right: 8px"
                          ><Check
                        /></el-icon>
                        {{
                          testingInboxNotification ? 'Loading...' : 'Test Notification Center Flow'
                        }}
                      </el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </el-tab-pane>
            </el-tabs>

            <!-- Sync Flow Result -->
            <div v-if="inboxSyncResult" class="test-result">
              <h3 class="result-title">Sync Flow Result:</h3>
              <div class="result-content">
                <div class="result-item">
                  <span class="result-label">Response Code:</span>
                  <el-tag :type="inboxSyncResult.responseCode === 0 ? 'success' : 'danger'">
                    {{ inboxSyncResult.responseCode }}
                  </el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Message:</span>
                  <span class="result-value">{{ inboxSyncResult.responseMessage }}</span>
                </div>
                <div
                  v-if="inboxSyncResult.responseCode === 0 && inboxSyncResult.data"
                  class="result-item"
                >
                  <span class="result-label">Account ID:</span>
                  <span class="result-value">{{ inboxSyncResult.data.accountId }}</span>
                </div>
                <div
                  v-if="inboxSyncResult.responseCode === 0 && inboxSyncResult.data"
                  class="result-item"
                >
                  <span class="result-label">Bakong Platform:</span>
                  <el-tag type="info">{{ inboxSyncResult.data.bakongPlatform }}</el-tag>
                </div>
                <div
                  v-if="inboxSyncResult.responseCode === 0 && inboxSyncResult.data"
                  class="result-item"
                >
                  <span class="result-label">Synced At:</span>
                  <span class="result-value">{{ inboxSyncResult.data.syncedAt }}</span>
                </div>
                <!-- Sync Status Display -->
                <div
                  v-if="inboxSyncResult.responseCode === 0 && inboxSyncResult.data?.syncStatus"
                  class="result-item"
                >
                  <span class="result-label">Sync Status:</span>
                  <div class="sync-status-details">
                    <el-tag
                      :type="
                        inboxSyncResult.data.syncStatus.status === 'SUCCESS' ? 'success' : 'danger'
                      "
                      style="margin-right: 8px"
                    >
                      {{ inboxSyncResult.data.syncStatus.status }}
                    </el-tag>
                    <div v-if="inboxSyncResult.data.syncStatus.lastSyncAt" class="sync-status-info">
                      <div>
                        <strong>Last Sync:</strong>
                        {{ new Date(inboxSyncResult.data.syncStatus.lastSyncAt).toLocaleString() }}
                      </div>
                    </div>
                    <div
                      v-if="inboxSyncResult.data.syncStatus.lastSyncMessage"
                      class="sync-status-message"
                    >
                      <strong>Message:</strong>
                      {{ inboxSyncResult.data.syncStatus.lastSyncMessage }}
                    </div>
                  </div>
                </div>
                <div
                  v-if="inboxSyncResult.responseCode === 1 && inboxSyncResult.data"
                  class="result-item error-item"
                >
                  <span class="result-label">Error:</span>
                  <span class="result-value error-text">{{ inboxSyncResult.data.error }}</span>
                </div>
              </div>
            </div>

            <!-- Notification Center Flow Result -->
            <div v-if="inboxNotificationResult" class="test-result">
              <h3 class="result-title">Notification Center Flow Result:</h3>
              <div class="result-content">
                <div class="result-item">
                  <span class="result-label">Response Code:</span>
                  <el-tag :type="inboxNotificationResult.responseCode === 0 ? 'success' : 'danger'">
                    {{ inboxNotificationResult.responseCode }}
                  </el-tag>
                </div>
                <div class="result-item">
                  <span class="result-label">Message:</span>
                  <span class="result-value">{{ inboxNotificationResult.responseMessage }}</span>
                </div>
                <div
                  v-if="inboxNotificationResult.responseCode === 0 && inboxNotificationResult.data"
                  class="result-item"
                >
                  <span class="result-label">Total Notifications:</span>
                  <el-tag type="info">{{ inboxNotificationResult.data.totalCount || 0 }}</el-tag>
                </div>
                <div
                  v-if="inboxNotificationResult.responseCode === 0 && inboxNotificationResult.data"
                  class="result-item"
                >
                  <span class="result-label">Page:</span>
                  <el-tag
                    >{{ inboxNotificationResult.data.page }} /
                    {{ inboxNotificationResult.data.pageCount }}</el-tag
                  >
                </div>
                <div
                  v-if="inboxNotificationResult.responseCode === 0 && inboxNotificationResult.data"
                  class="result-item"
                >
                  <span class="result-label">Items on Page:</span>
                  <el-tag type="success">{{ inboxNotificationResult.data.itemCount }}</el-tag>
                </div>
                <div
                  v-if="
                    inboxNotificationResult.responseCode === 0 &&
                    inboxNotificationResult.data &&
                    inboxNotificationResult.data.notifications
                  "
                  class="result-item"
                >
                  <span class="result-label">Notifications:</span>
                  <div class="notifications-preview">
                    <el-tag
                      v-for="(notif, index) in inboxNotificationResult.data.notifications.slice(
                        0,
                        5,
                      )"
                      :key="index"
                      size="small"
                      style="margin: 2px"
                    >
                      #{{ notif.id }}: {{ notif.title?.substring(0, 30) || 'No title' }}...
                    </el-tag>
                    <span
                      v-if="inboxNotificationResult.data.notifications.length > 5"
                      class="more-ids"
                    >
                      ... and {{ inboxNotificationResult.data.notifications.length - 5 }} more
                    </span>
                  </div>
                </div>
                <div
                  v-if="inboxNotificationResult.responseCode === 1 && inboxNotificationResult.data"
                  class="result-item error-item"
                >
                  <span class="result-label">Error:</span>
                  <span class="result-value error-text">{{
                    inboxNotificationResult.data.error
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Check, InfoFilled, Warning } from '@element-plus/icons-vue'
import { ElNotification, ElMessage } from 'element-plus'
import {
  testFCMToken,
  syncUsers,
  testInbox,
  type TestTokenResponse,
  type SyncUsersResponse,
  type InboxRequest,
} from '@/services/notificationApi'

// Token testing
const testingToken = ref(false)
const tokenTestForm = ref({
  token: '',
  bakongPlatform: 'BAKONG' as string | undefined,
})
const tokenTestResult = ref<TestTokenResponse | null>(null)

// Main tabs
const mainActiveTab = ref('token')

// User sync
const syncingUsers = ref(false)
const syncResult = ref<SyncUsersResponse | null>(null)

// Inbox API testing
const inboxActiveTab = ref('sync')
const testingInboxSync = ref(false)
const testingInboxNotification = ref(false)
const inboxSyncForm = ref<InboxRequest>({
  fcmToken: '',
  accountId: '',
  platform: 'IOS',
  participantCode: '',
  language: 'en',
  bakongPlatform: 'BAKONG',
  page: null,
  size: null,
})
const inboxNotificationForm = ref<InboxRequest>({
  fcmToken: '',
  accountId: '',
  platform: 'IOS',
  participantCode: '',
  language: 'en',
  bakongPlatform: 'BAKONG',
  page: 1,
  size: 10,
})
const inboxSyncResult = ref<any>(null)
const inboxNotificationResult = ref<any>(null)

const handleTokenInput = () => {
  // Clear previous results when token changes
  if (tokenTestResult.value) {
    tokenTestResult.value = null
  }
}

const handleTestToken = async () => {
  if (!tokenTestForm.value.token || !tokenTestForm.value.token.trim()) {
    ElMessage.warning('Please enter a token to test')
    return
  }

  testingToken.value = true
  tokenTestResult.value = null

  try {
    const result = await testFCMToken({
      token: tokenTestForm.value.token.trim(),
      bakongPlatform: tokenTestForm.value.bakongPlatform,
    })

    console.log('🔍 [handleTestToken] Received result:', result)
    console.log('🔍 [handleTestToken] Result isValid:', result.isValid)
    console.log('🔍 [handleTestToken] Result type:', typeof result)
    console.log('🔍 [handleTestToken] Result keys:', Object.keys(result || {}))

    tokenTestResult.value = result

    // Check if token is valid
    if (result && result.isValid === true) {
      ElNotification({
        title: 'Token Test Successful ✅',
        type: 'success',
        message: result.messageId
          ? `Token is valid! Test notification sent (ID: ${result.messageId.substring(0, 20)}...)`
          : 'Token is valid! A test notification has been sent.',
        duration: 5000,
      })
    } else {
      // Token is invalid or validation failed
      const errorMsg = result?.error || result?.errorCode || 'Token validation failed'
      ElNotification({
        title: 'Token Test Failed ❌',
        type: 'error',
        message: `Token is invalid: ${errorMsg}`,
        duration: 5000,
      })
    }
  } catch (err: any) {
    console.error('❌ [handleTestToken] Token test error:', err)
    console.error('❌ [handleTestToken] Error response:', err.response?.data)

    const errorMessage =
      err.response?.data?.responseMessage ||
      err.response?.data?.message ||
      err.message ||
      'Failed to test token'

    ElNotification({
      title: 'Test Error',
      type: 'error',
      message: errorMessage,
      duration: 5000,
    })

    // Set error result for display
    tokenTestResult.value = {
      isValid: false,
      formatValid: false,
      firebaseValid: false,
      error: errorMessage,
      errorCode: err.response?.data?.errorCode || err.code || 'UNKNOWN_ERROR',
    }
  } finally {
    testingToken.value = false
  }
}

const handleSyncUsers = async () => {
  syncingUsers.value = true
  syncResult.value = null

  try {
    console.log('🔄 [handleSyncUsers] Starting user sync...')
    const result = await syncUsers()
    console.log('🔄 [handleSyncUsers] Sync result:', result)

    syncResult.value = result

    if (result.updatedCount > 0) {
      ElNotification({
        title: 'User Sync Successful',
        type: 'success',
        message: `Successfully synced ${result.updatedCount} of ${result.totalCount} users`,
        duration: 5000,
      })
    } else {
      ElNotification({
        title: 'User Sync Completed',
        type: 'info',
        message: `All ${result.totalCount} users are already up to date`,
        duration: 5000,
      })
    }
  } catch (err: any) {
    console.error('❌ [handleSyncUsers] Sync error:', err)
    ElNotification({
      title: 'Sync Error',
      type: 'error',
      message: err.response?.data?.responseMessage || err.message || 'Failed to sync users',
      duration: 5000,
    })
    syncResult.value = null
  } finally {
    syncingUsers.value = false
  }
}

const handleTestInboxSync = async () => {
  if (
    !inboxSyncForm.value.accountId ||
    !inboxSyncForm.value.fcmToken ||
    !inboxSyncForm.value.bakongPlatform
  ) {
    ElMessage.warning('Please fill in all required fields')
    return
  }

  testingInboxSync.value = true
  inboxSyncResult.value = null

  try {
    const payload: InboxRequest = {
      fcmToken: inboxSyncForm.value.fcmToken.trim(),
      accountId: inboxSyncForm.value.accountId.trim(),
      platform: inboxSyncForm.value.platform,
      participantCode: inboxSyncForm.value.participantCode,
      language: inboxSyncForm.value.language,
      bakongPlatform: inboxSyncForm.value.bakongPlatform,
      page: null,
      size: null,
    }

    console.log('📬 [handleTestInboxSync] Sending sync request:', payload)
    const response = await testInbox(payload)
    console.log('📬 [handleTestInboxSync] Response:', response)

    // Backend returns BaseResponseDto format directly
    inboxSyncResult.value = response

    ElNotification({
      title: 'Sync Flow Test Successful ✅',
      type: 'success',
      message: `User data synchronized successfully for ${inboxSyncForm.value.accountId}`,
      duration: 5000,
    })
  } catch (err: any) {
    console.error('❌ [handleTestInboxSync] Error:', err)
    const errorMessage =
      err.response?.data?.responseMessage || err.message || 'Failed to sync user data'

    inboxSyncResult.value = {
      responseCode: 1,
      errorCode: err.response?.data?.errorCode || 1,
      responseMessage: errorMessage,
      data: {
        accountId: inboxSyncForm.value.accountId,
        error: err.response?.data?.data?.error || errorMessage,
      },
    }

    ElNotification({
      title: 'Sync Flow Test Failed ❌',
      type: 'error',
      message: errorMessage,
      duration: 5000,
    })
  } finally {
    testingInboxSync.value = false
  }
}

const handleTestSyncFailure = async () => {
  if (!inboxSyncForm.value.accountId || !inboxSyncForm.value.bakongPlatform) {
    ElMessage.warning('Please fill in Account ID and Bakong Platform')
    return
  }

  testingInboxSync.value = true
  inboxSyncResult.value = null

  try {
    // Test failure scenario: Use an accountId that's too long (will cause database error)
    // PostgreSQL VARCHAR(32) constraint will fail
    const invalidAccountId = 'a'.repeat(50) // 50 characters - exceeds 32 char limit

    const payload: InboxRequest = {
      fcmToken: inboxSyncForm.value.fcmToken || 'f', // Use short token "f" to test
      accountId: invalidAccountId, // This will cause database error
      platform: inboxSyncForm.value.platform,
      participantCode: inboxSyncForm.value.participantCode,
      language: inboxSyncForm.value.language,
      bakongPlatform: inboxSyncForm.value.bakongPlatform,
    }

    console.log('📬 [handleTestSyncFailure] Sending sync request with invalid data:', payload)
    const response = await testInbox(payload)
    console.log('📬 [handleTestSyncFailure] Response:', response)

    inboxSyncResult.value = response
  } catch (err: any) {
    console.error('❌ [handleTestSyncFailure] Error:', err)
    const errorMessage =
      err.response?.data?.responseMessage || err.message || 'Failed to sync user data'

    // Show error result
    inboxSyncResult.value = {
      responseCode: 1,
      responseMessage: errorMessage,
      data: {
        error: errorMessage,
        accountId: inboxSyncForm.value.accountId,
      },
    }

    ElNotification({
      title: 'Sync Failure Test ✅',
      type: 'info',
      message: `Failed sync scenario tested. Check syncStatus in database for FAILED status.`,
      duration: 5000,
    })
  } finally {
    testingInboxSync.value = false
  }
}

const handleTestInboxNotification = async () => {
  if (
    !inboxNotificationForm.value.accountId ||
    !inboxNotificationForm.value.fcmToken ||
    !inboxNotificationForm.value.bakongPlatform ||
    !inboxNotificationForm.value.page ||
    !inboxNotificationForm.value.size
  ) {
    ElMessage.warning('Please fill in all required fields')
    return
  }

  testingInboxNotification.value = true
  inboxNotificationResult.value = null

  try {
    const payload: InboxRequest = {
      fcmToken: inboxNotificationForm.value.fcmToken.trim(),
      accountId: inboxNotificationForm.value.accountId.trim(),
      platform: inboxNotificationForm.value.platform,
      participantCode: inboxNotificationForm.value.participantCode,
      language: inboxNotificationForm.value.language,
      bakongPlatform: inboxNotificationForm.value.bakongPlatform,
      page: inboxNotificationForm.value.page,
      size: inboxNotificationForm.value.size,
    }

    console.log('📬 [handleTestInboxNotification] Sending notification center request:', payload)
    const response = await testInbox(payload)
    console.log('📬 [handleTestInboxNotification] Response:', response)

    // Backend returns BaseResponseDto format directly
    inboxNotificationResult.value = response

    const notificationCount = (response as any).notifications?.length || 0
    ElNotification({
      title: 'Notification Center Test Successful ✅',
      type: 'success',
      message: `Retrieved ${notificationCount} notifications for ${inboxNotificationForm.value.accountId}`,
      duration: 5000,
    })
  } catch (err: any) {
    console.error('❌ [handleTestInboxNotification] Error:', err)
    const errorMessage =
      err.response?.data?.responseMessage || err.message || 'Failed to retrieve notifications'

    inboxNotificationResult.value = {
      responseCode: 1,
      errorCode: err.response?.data?.errorCode || 1,
      responseMessage: errorMessage,
      data: {
        accountId: inboxNotificationForm.value.accountId,
        error: err.response?.data?.data?.error || errorMessage,
      },
    }

    ElNotification({
      title: 'Notification Center Test Failed ❌',
      type: 'error',
      message: errorMessage,
      duration: 5000,
    })
  } finally {
    testingInboxNotification.value = false
  }
}
</script>

<style scoped>
.test-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  overflow: auto;
  padding: 24px;
}

.test-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.page-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 150%;
  color: #001346;
  margin: 0;
}

.page-description {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 150%;
  color: #666;
  margin: 0;
}

.test-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
  gap: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid rgba(0, 19, 70, 0.1);
}

.section-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 150%;
  color: #001346;
  margin: 0;
}

.section-description {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 150%;
  color: #666;
  margin: 0;
}

.platform-info-box {
  width: 100%;
  padding: 12px 16px;
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 8px;
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.info-icon {
  color: #1976d2;
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-content {
  flex: 1;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #1565c0;
}

.info-content strong {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.info-content p {
  margin: 0;
  color: #424242;
}

.sync-info-box {
  width: 100%;
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.info-box-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #001346;
  margin: 0 0 12px 0;
}

.sync-scenarios {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sync-scenarios li {
  margin-bottom: 16px;
  padding-left: 24px;
  position: relative;
}

.sync-scenarios li:last-child {
  margin-bottom: 0;
}

.sync-scenarios li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: #1976d2;
  font-weight: bold;
  font-size: 18px;
}

.sync-scenarios li strong {
  display: block;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #001346;
  margin-bottom: 4px;
}

.sync-scenarios li p {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
  margin: 0;
}

.sync-scenarios li code {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #d63384;
}

.warning-note {
  margin-top: 8px !important;
  padding: 8px 12px;
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  color: #856404 !important;
}

.sync-improvement-box {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #e8f5e9;
  border: 1px solid #81c784;
  border-radius: 8px;
}

.sync-improvement-box strong {
  display: block;
  color: #2e7d32;
  margin-bottom: 8px;
  font-size: 14px;
}

.sync-improvement-box p {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #1b5e20;
  margin: 8px 0;
}

.sync-improvement-box p:last-child {
  margin-bottom: 0;
}

.sync-improvement-box code {
  background-color: #c8e6c9;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #2e7d32;
}

.auto-cleanup-list {
  margin: 8px 0;
  padding-left: 20px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #1b5e20;
}

.auto-cleanup-list li {
  margin-bottom: 6px;
}

.note-text {
  margin-top: 12px !important;
  padding: 8px 12px;
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  color: #856404 !important;
}

.token-input-group {
  width: 100%;
}

.token-input-group :deep(.el-form-item) {
  margin-bottom: 20px;
}

.token-input-group :deep(.el-form-item__label) {
  font-weight: 500;
  color: #001346;
}

.token-input {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  width: 100%;
}

.test-token-btn {
  width: 100%;
  margin-top: 8px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.test-token-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-hint {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  font-style: italic;
}

.sync-actions {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.sync-users-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.sync-users-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.updated-ids-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.more-ids {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  color: #666;
  font-style: italic;
  align-self: center;
  margin-left: 8px;
}

.test-result {
  width: 100%;
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid rgba(0, 19, 70, 0.1);
  margin-top: 8px;
}

.result-title {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 150%;
  color: #001346;
  margin: 0 0 12px 0;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 19, 70, 0.05);
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #001346;
}

.result-value {
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #001346;
  text-align: right;
  word-break: break-all;
}

.error-item {
  background-color: #fff5f5;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #feb2b2;
}

.error-text {
  color: #dc3545;
  font-weight: 500;
}

.inbox-info-box {
  width: 100%;
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.main-tabs {
  width: 100%;
  margin-top: 16px;
}

.main-tabs :deep(.el-tabs__content) {
  padding: 20px 0;
}

.main-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
}

.inbox-tabs {
  width: 100%;
  margin-top: 16px;
}

.inbox-tabs :deep(.el-tabs__content) {
  padding: 20px 0;
}

.inbox-form-container {
  width: 100%;
}

.inbox-form-container :deep(.el-form-item) {
  margin-bottom: 20px;
}

.inbox-form-container :deep(.el-form-item__label) {
  font-weight: 500;
  color: #001346;
}

.test-inbox-btn {
  width: 100%;
  margin-top: 8px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.notifications-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.sync-status-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.sync-status-info,
.sync-status-message {
  font-size: 14px;
  color: #666;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.sync-status-message {
  word-break: break-word;
}

@media (max-width: 768px) {
  .test-page {
    padding: 16px;
  }

  .test-container {
    max-width: 100%;
  }
}
</style>
