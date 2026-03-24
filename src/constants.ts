export enum StageType {
  SURVEY = 'Giao cho nhân viên đo',
  EXTRACT = 'Hoàn thiện trích đo',
  COMPLETE_FILE = 'Hoàn thiện hồ sơ',
  SUBMIT = 'Nộp hồ sơ',
  RETURN_RESULT = 'Trả kết quả hồ sơ',
  INTERNAL_PROCESS = 'Nội nghiệp xử lý hồ sơ',
  RECEIVE_AND_RETURN = 'Nhận và Trả kết quả',
  MAKE_FILE = 'Làm hồ sơ',
}

export const STAGE_SLA_MAP: Record<StageType | string, number> = {
  [StageType.SURVEY]: 2,
  [StageType.EXTRACT]: 1,
  [StageType.COMPLETE_FILE]: 2,
  [StageType.SUBMIT]: 1,
  [StageType.RETURN_RESULT]: 1,
  [StageType.INTERNAL_PROCESS]: 1,
  [StageType.RECEIVE_AND_RETURN]: 1,
  [StageType.MAKE_FILE]: 1,
};

export const DEPARTMENT_STAGE_MAP: Record<string, string[]> = {
  'Ngoại nghiệp': [StageType.SURVEY, StageType.EXTRACT],
  'Nội nghiệp': [StageType.COMPLETE_FILE, StageType.SUBMIT, StageType.INTERNAL_PROCESS],
};

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE_MB: 3,
  MAX_SIZE_BASE64: 4 * 1024 * 1024 * 1.34,
  ALLOWED_TYPES: ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  BATCH_UPLOAD_SIZE: 2,
  UPLOAD_TIMEOUT_MS: 30000,
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Sai mật khẩu.',
  USER_NOT_FOUND: 'Không tìm thấy tên đăng nhập.',
  USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.',
  FILE_TOO_LARGE: (name: string) => `&quot;${name}&quot; quá lớn (tối đa ~3 MB). Vui lòng nén file trước.`,
  GAS_ERROR: 'GAS chưa được re-deploy hoặc lỗi script.',
  UPLOAD_FAILED: 'Tất cả file thất bại.',
  NO_FILE_URL: 'GAS không trả về URL.',
} as const;