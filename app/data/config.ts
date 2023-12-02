/** @format */

const menus = [
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-store.png',
        title: '5MB',
        tip: '单个文档'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-upload.png',
        title: '10个',
        tip: '每周上传'
    },
    {
        image: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/menu-ques.png',
        title: '99次',
        tip: '每周对话'
    }
]

const tasks = [
    {
        title: '分享给好友',
        tip: '对话+33 上传+5',
        button: '立即分享',
        type: 1 // 分享
    },
    {
        title: '关注公众号',
        tip: '加对话上传次数',
        button: '立即关注',
        type: 2 // 关注
    }
]

export default [
    {
        key: 'APP_NAME',
        value: '乐聊-微信小程序',
        description: '小程序名称'
    },
    {
        key: 'APP_URL',
        value: 'https://iict.ac.cn',
        description: ''
    },
    {
        key: 'APP_VERSION',
        value: 'v2.2.0',
        description: '小程序版本号'
    },
    {
        key: 'FOOT_TIP',
        value: '更多信息关注公众号',
        description: '底部标语'
    },
    {
        key: 'FOOT_COPY',
        value: 'IICT（点击复制）',
        description: '底部点击复制按钮'
    },
    {
        key: 'OFFICIAL',
        value: 'IICT_SUZ',
        description: '公众号ID'
    },
    {
        key: 'SHARE_TITLE',
        value: '大模型文档分析对话小程序！'
    },
    {
        key: 'SHARE_DESC',
        value: '大模型文档分析对话小程序！'
    },
    {
        key: 'SHARE_IMG',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/share-background.png'
    },
    {
        key: 'DEFAULT_AVATAR_AI',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-lechat.png'
    },
    {
        key: 'DEFAULT_AVATAR_USER',
        value: 'https://openai-1259183477.cos.ap-shanghai.myqcloud.com/avatar-user.png'
    },
    {
        key: 'DEFAULT_USERNAME',
        value: '人类用户'
    },
    {
        key: 'DEFAULT_FREE_CHAT_CHANCE',
        value: 99
    },
    {
        key: 'DEFAULT_FREE_UPLOAD_CHANCE',
        value: 10
    },
    {
        key: 'SHARE_REWARD_CHAT_CHANCE',
        value: 50
    },
    {
        key: 'SHARE_REWARD_UPLOAD_CHANCE',
        value: 5
    },
    {
        key: 'FOLLOW_REWARD_CHAT_CHANCE',
        value: 33
    },
    {
        key: 'INIT_RESOURCE_ID',
        value: 449
    },
    {
        key: 'USER_MENU',
        value: JSON.stringify(menus)
    },
    {
        key: 'USER_TASK',
        value: JSON.stringify(tasks)
    }
]
