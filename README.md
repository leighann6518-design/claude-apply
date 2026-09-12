# 企业 AI 观察：从案例到决策

Claude Enterprise AI 栏目的中文研究站点，基于 2026-09-12 的整理快照。

## 内容边界

本项目收录 71 个去重条目：62 篇正文要点分析、3 篇片段初步分析、6 篇仅目录收录。站点提供中文摘要、独立企业洞察和行动建议，不是逐篇全文译文，也不声称覆盖栏目全部文章。每篇文章均标注阅读范围和来源。本项目不是 Anthropic 官方站点。

原栏目：https://claude.com/blog-category/enterprise-ai

## 网站发布

使用 GitHub Actions 构建并部署到 GitHub Pages。推送到 `main` 或在 Actions 页面手动运行工作流即可触发发布。

首次发布需要在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。私有仓库使用 GitHub Pages 需要支持该功能的 GitHub 套餐；本工作流不会更改仓库可见性。通常生成的网站公开可访问，仓库私有不等于网站私有。

预期网站地址（以成功部署输出为准）：https://leighann6518-design.github.io/claude-apply/

## 本地构建

```sh
python3 build.py
python3 -m http.server 8000
```

打开 `http://localhost:8000`。构建只依赖 Python 标准库，输出独立的 `index.html` 和中文 `report.md`。

## 项目结构

- `articles.json`：逐篇文章的来源、中文摘要、独立分析和阅读范围。
- `insights.json`、`plan.json`、`meta.json`：跨案例洞察、行动模板及内容边界。
- `src/`：页面模板、样式和交互脚本。
- `build.py`：校验数据并生成静态站点与报告。
- `.github/workflows/deploy-pages.yml`：自动构建与部署。

收藏、已读状态和个人备注保存在访问者自己的浏览器中，不上传到仓库或服务器。更换浏览器或清除站点数据会影响这些本地记录。工作流只发布站点和报告，不上传整个源码目录。
