/** 内置一二线城市数据：name / pinyin / 区号 areaCode / adcode / 中心经纬度（GCJ-02） */
export const CITIES = [
  { name: '北京', pinyin: 'beijing', areaCode: '010', adcode: '110000', center: [116.4074, 39.9042] },
  { name: '上海', pinyin: 'shanghai', areaCode: '021', adcode: '310000', center: [121.4737, 31.2304] },
  { name: '广州', pinyin: 'guangzhou', areaCode: '020', adcode: '440100', center: [113.2644, 23.1291] },
  { name: '深圳', pinyin: 'shenzhen', areaCode: '0755', adcode: '440300', center: [114.0579, 22.5431] },
  { name: '杭州', pinyin: 'hangzhou', areaCode: '0571', adcode: '330100', center: [120.1551, 30.2741] },
  { name: '成都', pinyin: 'chengdu', areaCode: '028', adcode: '510100', center: [104.0665, 30.5723] },
  { name: '重庆', pinyin: 'chongqing', areaCode: '023', adcode: '500000', center: [106.5516, 29.563] },
  { name: '武汉', pinyin: 'wuhan', areaCode: '027', adcode: '420100', center: [114.3054, 30.5931] },
  { name: '西安', pinyin: 'xian', areaCode: '029', adcode: '610100', center: [108.9398, 34.3416] },
  { name: '南京', pinyin: 'nanjing', areaCode: '025', adcode: '320100', center: [118.7969, 32.0603] },
  { name: '苏州', pinyin: 'suzhou', areaCode: '0512', adcode: '320500', center: [120.5853, 31.2989] },
  { name: '天津', pinyin: 'tianjin', areaCode: '022', adcode: '120000', center: [117.2, 39.0842] },
  { name: '长沙', pinyin: 'changsha', areaCode: '0731', adcode: '430100', center: [112.9388, 28.2282] },
  { name: '郑州', pinyin: 'zhengzhou', areaCode: '0371', adcode: '410100', center: [113.6254, 34.7466] },
  { name: '青岛', pinyin: 'qingdao', areaCode: '0532', adcode: '370200', center: [120.3826, 36.0671] },
  { name: '济南', pinyin: 'jinan', areaCode: '0531', adcode: '370100', center: [117.1201, 36.6512] },
  { name: '合肥', pinyin: 'hefei', areaCode: '0551', adcode: '340100', center: [117.2272, 31.8206] },
  { name: '福州', pinyin: 'fuzhou', areaCode: '0591', adcode: '350100', center: [119.2965, 26.0745] },
  { name: '厦门', pinyin: 'xiamen', areaCode: '0592', adcode: '350200', center: [118.0894, 24.4798] },
  { name: '宁波', pinyin: 'ningbo', areaCode: '0574', adcode: '330200', center: [121.5503, 29.8746] },
  { name: '无锡', pinyin: 'wuxi', areaCode: '0510', adcode: '320200', center: [120.3119, 31.4912] },
  { name: '佛山', pinyin: 'foshan', areaCode: '0757', adcode: '440600', center: [113.1214, 23.0215] },
  { name: '东莞', pinyin: 'dongguan', areaCode: '0769', adcode: '441900', center: [113.7518, 23.0207] },
  { name: '昆明', pinyin: 'kunming', areaCode: '0871', adcode: '530100', center: [102.8329, 24.8801] },
  { name: '大连', pinyin: 'dalian', areaCode: '0411', adcode: '210200', center: [121.6147, 38.914] },
  { name: '沈阳', pinyin: 'shenyang', areaCode: '024', adcode: '210100', center: [123.4315, 41.8057] },
  { name: '哈尔滨', pinyin: 'haerbin', areaCode: '0451', adcode: '230100', center: [126.5349, 45.8038] },
  { name: '长春', pinyin: 'changchun', areaCode: '0431', adcode: '220100', center: [125.3235, 43.8171] },
  { name: '石家庄', pinyin: 'shijiazhuang', areaCode: '0311', adcode: '130100', center: [114.5149, 38.0428] },
  { name: '太原', pinyin: 'taiyuan', areaCode: '0351', adcode: '140100', center: [112.5489, 37.8706] },
  { name: '南昌', pinyin: 'nanchang', areaCode: '0791', adcode: '360100', center: [115.8582, 28.6829] },
  { name: '贵阳', pinyin: 'guiyang', areaCode: '0851', adcode: '520100', center: [106.6302, 26.647] },
  { name: '南宁', pinyin: 'nanning', areaCode: '0771', adcode: '450100', center: [108.3669, 22.8167] },
  { name: '兰州', pinyin: 'lanzhou', areaCode: '0931', adcode: '620100', center: [103.8343, 36.0611] },
  { name: '乌鲁木齐', pinyin: 'wulumuqi', areaCode: '0991', adcode: '650100', center: [87.6168, 43.8256] },
]

export const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津']

export const DEFAULT_CITY = CITIES.find((c) => c.name === '上海')

/** 按城市名 / 拼音 / 区号 / adcode 模糊匹配 */
export function searchCities(query) {
  const q = query.trim().toLowerCase()
  if (!q) return CITIES
  return CITIES.filter(
    (c) =>
      c.name.includes(q) ||
      c.pinyin.includes(q) ||
      c.areaCode.includes(q) ||
      c.adcode.includes(q),
  )
}
