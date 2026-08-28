const fs = require("fs");
let content = fs.readFileSync("routes/projectRoutes.js", "utf8");
content = content.replace("module.exports = router;", `// Get all projects
router.get("/", projectController.getProjects);

// Update project
router.put("/:id", authorizeAdmin, projectController.updateProject);

// Delete project
router.delete("/:id", authorizeAdmin, projectController.deleteProject);

module.exports = router;`);
fs.writeFileSync("routes/projectRoutes.js", content);
