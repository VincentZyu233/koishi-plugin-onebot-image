export const IMAGE_STYLES = {
  SOURCE_HAN_SERIF_SC: '思源宋体SourceHanSerifSC',
  LXGW_WENKAI: '落霞孤鹜LXGWWenKai'
} as const;

// 样式类型定义
export type ImageStyle = typeof IMAGE_STYLES[keyof typeof IMAGE_STYLES];

// 字体文件映射
export const FONT_FILES = {
  [IMAGE_STYLES.SOURCE_HAN_SERIF_SC]: 'SourceHanSerifSC-Medium.otf',
  [IMAGE_STYLES.LXGW_WENKAI]: 'LXGWWenKaiMono-Regular.ttf'
} as const;