/**
 * Barrel: re-exports all API modules so existing imports from "../api/client" keep working.
 */

export {
  API,
  productImageUrl,
  getErrorMessage,
  setAuthRefresher,
  setStaffAuthRefresher,
  request,
  uploadFile,
} from "./core";

export type {
  User,
  TokenOut,
  BinLookupResult,
  OnboardingBody,
  ProfileUpdateBody,
  Product,
  Review,
  ProductReviewsResponse,
  VendorRating,
  Notification,
  ProductList,
  Machine,
  GarageItem,
  OrderItem,
  Order,
  Category,
  CategoryTree,
  CartItem,
  MaintenanceRecommendation,
  MaintenanceAdvice,
  SearchSuggest,
  RecommendationOut,
  CompatibilityVerification,
  ChatHistoryItem,
  ChatMessageIn,
  ChatMessageOut,
  OpenAIHealth,
  ChatSessionItem,
  ChatSessionMessage,
  ChatStreamCallbacks,
  FeedbackCreate,
  FeedbackOut,
} from "./types";

export {
  getRegions,
  getBinLookup,
  postOnboarding,
  patchAuthMe,
  loginWithPassword,
  postAuthRefresh,
  postLogout,
  setUserPassword,
} from "./auth";

export {
  uploadProductImage,
  getProductReviews,
  postProductReview,
  getVendorRating,
} from "./products";

export { getNotifications, getUnreadNotificationsCount, markNotificationRead } from "./notifications";

export { getCategoryTree } from "./catalog";

export {
  checkCompatibility,
  getRecommendations,
  getMaintenanceAdvice,
  getSearchSuggest,
} from "./recommendations";

export {
  getOpenAIHealth,
  sendChatMessage,
  getChatSessions,
  getChatSessionMessages,
  sendChatFeedback,
  sendChatMessageStream,
} from "./chat";

export { postFeedback } from "./feedback";

export {
  getAdminDashboard,
  getAdminSearch,
  getAdminUser,
  getAdminOrders,
  getAdminOrder,
  getAdminFeedback,
  getAdminReplyTemplates,
  getAdminFeedbackTicket,
  patchAdminFeedback,
  postAdminSendNotification,
  getAdminAuditLog,
} from "./admin";

export type {
  AdminOrderOut,
  AdminDashboard,
  AdminSearchResult,
  FeedbackMessageOut,
  FeedbackTicketAdminOut,
  ReplyTemplateOut,
  AuditLogOut,
} from "./admin";

export {
  getVendorTeam,
  postVendorTeamInvite,
  patchVendorTeamMemberRole,
  deleteVendorTeamMember,
  getVendorAuditLog,
} from "./vendor";

export type { CompanyRole, TeamMemberOut } from "./vendor";

export {
  staffLogin,
  postStaffRefresh,
  staffMe,
  staffChangePassword,
  getStaffEmployees,
  postStaffEmployee,
  patchStaffEmployee,
  getStaffPermissions,
  getStaffRoles,
  postStaffRole,
  patchStaffRole,
} from "./staff";

export type {
  StaffRole,
  StaffMe,
  StaffLoginResponse,
  StaffEmployeeOut,
  StaffPermissionOut,
  StaffRoleOut,
} from "./staff";
