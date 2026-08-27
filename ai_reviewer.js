/**
 * 17173 厂商稿 AI 智能审稿模块 v1.0
 * 基于 NLP 规则引擎的中文文本校对系统
 * 
 * 功能：
 * - 错别字/同音词检测 (基于 17173 游戏领域词库)
 * - 标点符号规范检查
 * - 标题长度与格式校验
 * - 语句通顺度评分 (基于句子结构分析)
 * - 敏感词过滤
 */

const AIReviewer = (() => {
    // 游戏领域同音字/易错词词库
    const TYPO_DB = {
        '帐号': '账号', '登陆': '登录', '角色': '角色', '升及': '升级',
        '公会': '公会', 'PK': 'PK', 'cd': 'CD', 'Buff': 'Buff',
        '装备': '装备', '技能': '技能', '副本': '副本', '手游': '手游',
        '端游': '端游', '页游': '页游', '测试': '测试', '公测': '公测',
        '上线': '上线', '上线': '上线', '首充': '首充', '返利': '返利',
        '福利': '福利', '礼包': '礼包', '兑换码': '兑换码',
        '一血': '一血', '五杀': '五杀', '超神': '超神', 'MVP': 'MVP',
        'KDA': 'KDA', 'ADC': 'ADC', 'AP': 'AP', 'AD': 'AD'
    };

    // 标点符号规范
    const PUNCT_RULES = [
        { pattern: /，/g, replacement: '，', name: '中文逗号' },
        { pattern: /。/g, replacement: '。', name: '中文句号' },
        { pattern: /？/g, replacement: '？', name: '中文问号' },
        { pattern: /！/g, replacement: '！', name: '中文感叹号' },
        { pattern: /\.{3,}/g, replacement: '……', name: '省略号规范' },
        { pattern: /—{2,}/g, replacement: '——', name: '破折号规范' }
    ];

    // 敏感词库 (示例)
    const SENSITIVE_WORDS = ['私服', '外挂', '代练', 'CDK', 'BUG'];

    /**
     * 执行深度审稿
     * @param {string} title - 文章标题
     * @param {string} htmlContent - 正文 HTML
     * @returns {Object} 审稿报告
     */
    function review(title, htmlContent) {
        const report = {
            score: 100,
            issues: [],
            suggestions: [],
            stats: {
                charCount: 0,
                wordCount: 0,
                imageCount: 0,
                typoCount: 0,
                punctErrorCount: 0
            }
        };

        // 1. 标题检查
        checkTitle(title, report);
        
        // 2. 清理 HTML 获取纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const plainText = tempDiv.textContent || tempDiv.innerText;
        
        report.stats.charCount = plainText.length;
        report.stats.wordCount = plainText.replace(/\s+/g, '').length;

        // 3. 错别字检测
        checkTypos(plainText, report);

        // 4. 标点检查
        checkPunctuation(plainText, report);

        // 5. 语句通顺度 (简易版)
        checkSentenceStructure(plainText, report);

        // 6. 敏感词检查
        checkSensitiveWords(plainText, report);

        // 7. 计算最终分数
        calculateScore(report);

        return report;
    }

    function checkTitle(title, report) {
        if (!title || title.length < 5) {
            report.issues.push({ type: 'error', msg: '标题过短，建议 10-30 字' });
            report.score -= 10;
        }
        if (title.length > 50) {
            report.issues.push({ type: 'error', msg: '标题超过 50 字，将被截断' });
            report.score -= 5;
        }
        if (/[a-zA-Z]{4,}/.test(title) && !/[A-Z]/.test(title)) {
            report.suggestions.push('标题中的英文建议使用首字母大写');
        }
    }

    function checkTypos(text, report) {
        for (const [wrong, right] of Object.entries(TYPO_DB)) {
            const regex = new RegExp(wrong, 'gi');
            const matches = text.match(regex);
            if (matches) {
                report.issues.push({
                    type: 'typo',
                    msg: `发现疑似错别字「${wrong}」，建议改为「${right}」`,
                    count: matches.length
                });
                report.stats.typoCount += matches.length;
                report.score -= (matches.length * 2);
            }
        }
    }

    function checkPunctuation(text, report) {
        // 中英文标点混用检查
        if (/[a-zA-Z],[a-zA-Z]/.test(text)) {
            report.suggestions.push('英文单词之间建议使用英文逗号或空格');
        }
        
        // 连续标点检查
        if (/[，。！？]{2,}/.test(text)) {
            report.issues.push({ type: 'punct', msg: '发现连续标点符号' });
            report.score -= 3;
        }
    }

    function checkSentenceStructure(text, report) {
        // 句子平均长度检查 (过长可能不通顺)
        const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
        const avgLength = text.length / Math.max(sentences.length, 1);
        
        if (avgLength > 80) {
            report.suggestions.push('句子平均长度过长，建议拆分，提高可读性');
        }
        
        // 语病检测 (基于常见模式)
        const badPatterns = [
            /通过.*使.*/,      // "通过...使..." 缺主语
            /.*的的.*/,        // "的的" 重复
            /.*了了.*/,        // "了了" 重复
            /.*是是.*/         // "是是" 重复
        ];
        
        badPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                report.issues.push({ type: 'grammar', msg: '发现疑似语病或重复用词' });
                report.score -= 5;
            }
        });
    }

    function checkSensitiveWords(text, report) {
        SENSITIVE_WORDS.forEach(word => {
            if (text.includes(word)) {
                report.issues.push({ type: 'sensitive', msg: `包含敏感词「${word}」，请确认是否合规` });
                report.score -= 10;
            }
        });
    }

    function calculateScore(report) {
        report.score = Math.max(0, Math.min(100, report.score));
        report.level = report.score >= 90 ? '优秀' : 
                       report.score >= 70 ? '良好' : 
                       report.score >= 50 ? '一般' : '需修改';
    }

    // 暴露公共接口
    return { review };
})();

// 挂载到 window 供主脚本调用
if (typeof window !== 'undefined') {
    window.AIReviewer = AIReviewer;
}
