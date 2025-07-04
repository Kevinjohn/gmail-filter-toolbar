```diff
diff --git a/src/styles.css b/src/styles.css
index 464fda4..0b502a0 100644
--- a/src/styles.css
+++ b/src/styles.css
@@ -34,6 +34,11 @@
   z-index: 4; position: relative;
 }
 
+.gcal-btn-group {
+  display: flex;
+  flex-wrap: wrap;
+}
+
 .gcal-btn-group button {
   background: none;
   border: 1px solid var(--gcal-border-color);
@@ -41,12 +46,41 @@
   padding: 4px 8px;
   border-radius: 4px;
   cursor: pointer;
+  margin-inline-end: 8px;
+  margin-block: 8px;
+  display: flex;
+  align-items: center;
+}
+
+.gcal-btn-group button .text-label {
+  font-size: 12px;
+}
+
+.gcal-btn-group button .material-symbols-outlined {
+  margin-inline-end: 4px;
+}
+
+.gcal-btn-group button .material-symbols-outlined {
   margin-inline-end: 4px;
 }
 
 .gcal-btn-group button[data-active] {
-  font-weight: bold;
   color: var(--gcal-active-button-text);
   border-color: var(--gcal-active-button-text);
 }
 
+.material-symbols-outlined {
+  font-family: 'Material Symbols Outlined';
+  font-weight: normal;
+  font-style: normal;
+  font-size: 20px;
+  line-height: 1;
+  letter-spacing: normal;
+  text-transform: none;
+  display: inline-block;
+  white-space: nowrap;
+  word-wrap: normal;
+  direction: ltr;
+  -webkit-font-feature-settings: 'liga';
+  -webkit-font-smoothing: antialiased;
+}

```