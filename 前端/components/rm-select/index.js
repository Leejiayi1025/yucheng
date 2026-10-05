Component({
  properties: {
    options: { type: Array, value: [] },     // [{label,value,color?,special?}]
    value: { type: null, value: '' },          // 当前选中的 value
    placeholder: { type: String, value: '请选择' }
  },
  data: {
    open: false,
    displayLabel: '',
    menuTop: 0,
    menuLeft: 0,
    menuWidth: 200
  },
  observers: {
    'options, value': function (options, value) {
      const hit = (options || []).find(o => String(o.value) === String(value));
      this.setData({ displayLabel: hit ? hit.label : this.data.placeholder });
    }
  },
  methods: {
    onTrigger() {
      if (this.data.open) { this.setData({ open: false }); return; }
      const q = wx.createSelectorQuery().in(this);
      q.select('.rm-trigger').boundingClientRect(rect => {
        if (!rect) return;
        const w = Math.max(rect.width, 220);
        this.setData({
          open: true,
          menuTop: rect.bottom + 6,
          menuLeft: Math.min(rect.left, wx.getSystemInfoSync().windowWidth - w - 8),
          menuWidth: w
        });
      }).exec();
    },
    onMask() { this.setData({ open: false }); },
    onSelect(e) {
      const idx = e.currentTarget.dataset.index;
      const opt = this.data.options[idx];
      if (!opt) return;
      if (opt.special) {
        this.triggerEvent('custom', { option: opt });
        this.setData({ open: false });
        return;
      }
      this.setData({ open: false, displayLabel: opt.label });
      this.triggerEvent('change', { value: opt.value, option: opt });
    }
  }
});
