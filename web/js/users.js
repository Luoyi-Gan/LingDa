window.LingDaUsers = {
  ME_ID: 'me',
  list: {
    me: { id: 'me', name: '开发预览', av: '开', college: '新闻学院', major: '前端', grade: '研一', bio: '本地 UI 开发预览账号', rating: '4.9', teams: 8, posts: 3, tag: '认证学生' },
    zhou: { id: 'zhou', name: '周一凡', av: '周', college: '工学院', major: '车辆', grade: '大四', bio: '机场拼车达人，准时靠谱。', rating: '4.9', teams: 12, posts: 3, tag: '认证学生' },
    ye: { id: 'ye', name: '叶舟', av: '叶', college: '信息学院', major: '计科', grade: '大二', bio: '王者 / Steam 开黑。', rating: '4.7', teams: 9, posts: 6, tag: '认证学生' },
    cheng: { id: 'cheng', name: '程思', av: '程', college: '信息学院', major: '算法', grade: '研二', bio: '考研数学 / 算法组队。', rating: '5.0', teams: 15, posts: 11, tag: '认证学生' },
    lin: { id: 'lin', name: '小林', av: '林', college: '理学院', major: '数学', grade: '大二', bio: '高数进度党，常去二教。', rating: '4.7', teams: 5, posts: 7, tag: '认证学生' },
    su: { id: 'su', name: '苏晴', av: '苏', college: '外语学院', major: '英语', grade: '研一', bio: '周末返乡拼车。', rating: '4.8', teams: 8, posts: 2, tag: '认证学生' },
  },
  get: function (id) { return this.list[id] || null; },
  isSelf: function (id) { return !id || id === this.ME_ID; },
};
