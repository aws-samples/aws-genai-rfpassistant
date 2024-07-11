"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagEngines = void 0;
const constructs_1 = require("constructs");
const aurora_pgvector_1 = require("./aurora-pgvector");
const data_import_1 = require("./data-import");
const kendra_retrieval_1 = require("./kendra-retrieval");
const opensearch_vector_1 = require("./opensearch-vector");
const rag_dynamodb_tables_1 = require("./rag-dynamodb-tables");
const workspaces_1 = require("./workspaces");
class RagEngines extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const tables = new rag_dynamodb_tables_1.RagDynamoDBTables(this, "RagDynamoDBTables");
        let sageMakerRagModels = null;
        // if (
        //   props.config.rag.engines.aurora.enabled ||
        //   props.config.rag.engines.opensearch.enabled
        // ) {
        //   // sageMakerRagModels = new SageMakerRagModels(this, "SageMaker", {
        //   //   shared: props.shared,
        //   //   config: props.config,
        //   // });
        // }
        let auroraPgVector = null;
        if (props.config.rag.engines.aurora.enabled) {
            auroraPgVector = new aurora_pgvector_1.AuroraPgVector(this, "AuroraPgVector", {
                shared: props.shared,
                config: props.config,
                ragDynamoDBTables: tables,
            });
        }
        let openSearchVector = null;
        if (props.config.rag.engines.opensearch.enabled) {
            openSearchVector = new opensearch_vector_1.OpenSearchVector(this, "OpenSearchVector", {
                shared: props.shared,
                config: props.config,
                ragDynamoDBTables: tables,
            });
        }
        let kendraRetrieval = null;
        if (props.config.rag.engines.kendra.enabled) {
            kendraRetrieval = new kendra_retrieval_1.KendraRetrieval(this, "KendraRetrieval", {
                shared: props.shared,
                config: props.config,
                ragDynamoDBTables: tables,
            });
        }
        const dataImport = new data_import_1.DataImport(this, "DataImport", {
            shared: props.shared,
            config: props.config,
            auroraDatabase: auroraPgVector?.database,
            sageMakerRagModels: sageMakerRagModels ?? undefined,
            workspacesTable: tables.workspacesTable,
            documentsTable: tables.documentsTable,
            ragDynamoDBTables: tables,
            workspacesByObjectTypeIndexName: tables.workspacesByObjectTypeIndexName,
            documentsByCompoundKeyIndexName: tables.documentsByCompoundKeyIndexName,
            openSearchVector: openSearchVector ?? undefined,
            kendraRetrieval: kendraRetrieval ?? undefined,
        });
        const workspaces = new workspaces_1.Workspaces(this, "Workspaces", {
            shared: props.shared,
            config: props.config,
            dataImport,
            ragDynamoDBTables: tables,
            auroraPgVector: auroraPgVector ?? undefined,
            openSearchVector: openSearchVector ?? undefined,
            kendraRetrieval: kendraRetrieval ?? undefined,
        });
        this.auroraPgVector = auroraPgVector;
        this.openSearchVector = openSearchVector;
        this.kendraRetrieval = kendraRetrieval;
        this.sageMakerRagModels = sageMakerRagModels;
        this.uploadBucket = dataImport.uploadBucket;
        this.processingBucket = dataImport.processingBucket;
        this.workspacesTable = tables.workspacesTable;
        this.documentsTable = tables.documentsTable;
        this.workspacesByObjectTypeIndexName =
            tables.workspacesByObjectTypeIndexName;
        this.documentsByCompountKeyIndexName =
            tables.documentsByCompoundKeyIndexName;
        this.documentsByStatusIndexName = tables.documentsByStatusIndexName;
        this.fileImportWorkflow = dataImport.fileImportWorkflow;
        this.websiteCrawlingWorkflow = dataImport.websiteCrawlingWorkflow;
        this.deleteWorkspaceWorkflow = workspaces.deleteWorkspaceWorkflow;
        this.dataImport = dataImport;
    }
}
exports.RagEngines = RagEngines;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSwyQ0FBdUM7QUFHdkMsdURBQW1EO0FBQ25ELCtDQUEyQztBQUMzQyx5REFBcUQ7QUFDckQsMkRBQXVEO0FBQ3ZELCtEQUEwRDtBQUUxRCw2Q0FBMEM7QUFPMUMsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFpQnZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLE1BQU0sR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRWhFLElBQUksa0JBQWtCLEdBQThCLElBQUksQ0FBQztRQUN6RCxPQUFPO1FBQ1AsK0NBQStDO1FBQy9DLGdEQUFnRDtRQUNoRCxNQUFNO1FBQ04sd0VBQXdFO1FBQ3hFLCtCQUErQjtRQUMvQiwrQkFBK0I7UUFDL0IsV0FBVztRQUNYLElBQUk7UUFFSixJQUFJLGNBQWMsR0FBMEIsSUFBSSxDQUFDO1FBQ2pELElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDM0MsY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQzFELE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtnQkFDcEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO2dCQUNwQixpQkFBaUIsRUFBRSxNQUFNO2FBQzFCLENBQUMsQ0FBQztTQUNKO1FBRUQsSUFBSSxnQkFBZ0IsR0FBNEIsSUFBSSxDQUFDO1FBQ3JELElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDL0MsZ0JBQWdCLEdBQUcsSUFBSSxvQ0FBZ0IsQ0FB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bnRlbnQiOlsiaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgQXVyb3JhUGdWZWN0b3IgfSBmcm9tIFwiLi9hdXJvcmEtcGd2ZWN0b3JcIjtcbmltcG9ydCB7IERhdGFJbXBvcnQgfSBmcm9tIFwiLi9kYXRhLWltcG9ydFwiO1xuaW1wb3J0IHsgS2VuZHJhUmV0cmlldmFsIH0gZnJvbSBcIi4va2VuZHJhLXJldHJpZXZhbFwiO1xuaW1wb3J0IHsgT3BlblNlYXJjaFZlY3RvciB9IGZyb20gXCIuL29wZW5zZWFyY2gtdmVjdG9yXCI7XG5pbXBvcnQgeyBSYWdEeW5hbW9EQlRhYmxlcyB9IGZyb20gXCIuL3JhZy1keW5hbW9kYi10YWJsZXNcIjtcbmltcG9ydCB7IFNhZ2VNYWtlclJhZ01vZGVscyB9IGZyb20gXCIuL3NhZ2VtYWtlci1yYWctbW9kZWxzXCI7XG5pbXBvcnQgeyBXb3Jrc3BhY2VzIH0gZnJvbSBcIi4vd29ya3NwYWNlc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJhZ0VuZ2luZXNQcm9wcyB7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbn1cblxuZXhwb3J0IGNsYXNzIFJhZ0VuZ2luZXMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYXVyb3JhUGdWZWN0b3I6IEF1cm9yYVBnVmVjdG9yIHwgbnVsbDtcbiAgcHVibGljIHJlYWRvbmx5IG9wZW5TZWFyY2hWZWN0b3I6IE9wZW5TZWFyY2hWZWN0b3IgfCBudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkga2VuZHJhUmV0cmlldmFsOiBLZW5kcmFSZXRyaWV2YWwgfCBudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgc2FnZU1ha2VyUmFnTW9kZWxzOiBTYWdlTWFrZXJSYWdNb2RlbHMgfCBudWxsO1xuICBwdWJsaWMgcmVhZG9ubHkgdXBsb2FkQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBwcm9jZXNzaW5nQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBkb2N1bWVudHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSB3b3Jrc3BhY2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgd29ya3NwYWNlc0J5T2JqZWN0VHlwZUluZGV4TmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgZG9jdW1lbnRzQnlDb21wb3VudEtleUluZGV4TmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgZG9jdW1lbnRzQnlTdGF0dXNJbmRleE5hbWU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGZpbGVJbXBvcnRXb3JrZmxvdz86IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIHB1YmxpYyByZWFkb25seSB3ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdz86IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIHB1YmxpYyByZWFkb25seSBkZWxldGVXb3Jrc3BhY2VXb3JrZmxvdz86IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhSW1wb3J0OiBEYXRhSW1wb3J0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSYWdFbmdpbmVzUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgdGFibGVzID0gbmV3IFJhZ0R5bmFtb0RCVGFibGVzKHRoaXMsIFwiUmFnRHluYW1vREJUYWJsZXNcIik7XG5cbiAgICBsZXQgc2FnZU1ha2VyUmFnTW9kZWxzOiBTYWdlTWFrZXJSYWdNb2RlbHMgfCBudWxsID0gbnVsbDtcbiAgICAvLyBpZiAoXG4gICAgLy8gICBwcm9wcy5jb25maWcucmFnLmVuZ2luZXMuYXVyb3JhLmVuYWJsZWQgfHxcbiAgICAvLyAgIHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5vcGVuc2VhcmNoLmVuYWJsZWRcbiAgICAvLyApIHtcbiAgICAvLyAgIC8vIHNhZ2VNYWtlclJhZ01vZGVscyA9IG5ldyBTYWdlTWFrZXJSYWdNb2RlbHModGhpcywgXCJTYWdlTWFrZXJcIiwge1xuICAgIC8vICAgLy8gICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAvLyAgIC8vICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgLy8gICAvLyB9KTtcbiAgICAvLyB9XG5cbiAgICBsZXQgYXVyb3JhUGdWZWN0b3I6IEF1cm9yYVBnVmVjdG9yIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5hdXJvcmEuZW5hYmxlZCkge1xuICAgICAgYXVyb3JhUGdWZWN0b3IgPSBuZXcgQXVyb3JhUGdWZWN0b3IodGhpcywgXCJBdXJvcmFQZ1ZlY3RvclwiLCB7XG4gICAgICAgIHNoYXJlZDogcHJvcHMuc2hhcmVkLFxuICAgICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgICAgcmFnRHluYW1vREJUYWJsZXM6IHRhYmxlcyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBvcGVuU2VhcmNoVmVjdG9yOiBPcGVuU2VhcmNoVmVjdG9yIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5vcGVuc2VhcmNoLmVuYWJsZWQpIHtcbiAgICAgIG9wZW5TZWFyY2hWZWN0b3IgPSBuZXcgT3BlblNlYXJjaFZlY3Rvcih0aGlzLCBcIk9wZW5TZWFyY2hWZWN0b3JcIiwge1xuICAgICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiB0YWJsZXMsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQga2VuZHJhUmV0cmlldmFsOiBLZW5kcmFSZXRyaWV2YWwgfCBudWxsID0gbnVsbDtcbiAgICBpZiAocHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5lbmFibGVkKSB7XG4gICAgICBrZW5kcmFSZXRyaWV2YWwgPSBuZXcgS2VuZHJhUmV0cmlldmFsKHRoaXMsIFwiS2VuZHJhUmV0cmlldmFsXCIsIHtcbiAgICAgICAgc2hhcmVkOiBwcm9wcy5zaGFyZWQsXG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgICByYWdEeW5hbW9EQlRhYmxlczogdGFibGVzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YUltcG9ydCA9IG5ldyBEYXRhSW1wb3J0KHRoaXMsIFwiRGF0YUltcG9ydFwiLCB7XG4gICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgYXVyb3JhRGF0YWJhc2U6IGF1cm9yYVBnVmVjdG9yPy5kYXRhYmFzZSxcbiAgICAgIHNhZ2VNYWtlclJhZ01vZGVsczogc2FnZU1ha2VyUmFnTW9kZWxzID8/IHVuZGVmaW5lZCxcbiAgICAgIHdvcmtzcGFjZXNUYWJsZTogdGFibGVzLndvcmtzcGFjZXNUYWJsZSxcbiAgICAgIGRvY3VtZW50c1RhYmxlOiB0YWJsZXMuZG9jdW1lbnRzVGFibGUsXG4gICAgICByYWdEeW5hbW9EQlRhYmxlczogdGFibGVzLFxuICAgICAgd29ya3NwYWNlc0J5T2JqZWN0VHlwZUluZGV4TmFtZTogdGFibGVzLndvcmtzcGFjZXNCeU9iamVjdFR5cGVJbmRleE5hbWUsXG4gICAgICBkb2N1bWVudHNCeUNvbXBvdW5kS2V5SW5kZXhOYW1lOiB0YWJsZXMuZG9jdW1lbnRzQnlDb21wb3VuZEtleUluZGV4TmFtZSxcbiAgICAgIG9wZW5TZWFyY2hWZWN0b3I6IG9wZW5TZWFyY2hWZWN0b3IgPz8gdW5kZWZpbmVkLFxuICAgICAga2VuZHJhUmV0cmlldmFsOiBrZW5kcmFSZXRyaWV2YWwgPz8gdW5kZWZpbmVkLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlcyA9IG5ldyBXb3Jrc3BhY2VzKHRoaXMsIFwiV29ya3NwYWNlc1wiLCB7XG4gICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgZGF0YUltcG9ydCxcbiAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiB0YWJsZXMsXG4gICAgICBhdXJvcmFQZ1ZlY3RvcjogYXVyb3JhUGdWZWN0b3IgPz8gdW5kZWZpbmVkLFxuICAgICAgb3BlblNlYXJjaFZlY3Rvcjogb3BlblNlYXJjaFZlY3RvciA/PyB1bmRlZmluZWQsXG4gICAgICBrZW5kcmFSZXRyaWV2YWw6IGtlbmRyYVJldHJpZXZhbCA/PyB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICB0aGlzLmF1cm9yYVBnVmVjdG9yID0gYXVyb3JhUGdWZWN0b3I7XG4gICAgdGhpcy5vcGVuU2VhcmNoVmVjdG9yID0gb3BlblNlYXJjaFZlY3RvcjtcbiAgICB0aGlzLmtlbmRyYVJldHJpZXZhbCA9IGtlbmRyYVJldHJpZXZhbDtcbiAgICB0aGlzLnNhZ2VNYWtlclJhZ01vZGVscyA9IHNhZ2VNYWtlclJhZ01vZGVscztcbiAgICB0aGlzLnVwbG9hZEJ1Y2tldCA9IGRhdGFJbXBvcnQudXBsb2FkQnVja2V0O1xuICAgIHRoaXMucHJvY2Vzc2luZ0J1Y2tldCA9IGRhdGFJbXBvcnQucHJvY2Vzc2luZ0J1Y2tldDtcbiAgICB0aGlzLndvcmtzcGFjZXNUYWJsZSA9IHRhYmxlcy53b3Jrc3BhY2VzVGFibGU7XG4gICAgdGhpcy5kb2N1bWVudHNUYWJsZSA9IHRhYmxlcy5kb2N1bWVudHNUYWJsZTtcbiAgICB0aGlzLndvcmtzcGFjZXNCeU9iamVjdFR5cGVJbmRleE5hbWUgPVxuICAgICAgdGFibGVzLndvcmtzcGFjZXNCeU9iamVjdFR5cGVJbmRleE5hbWU7XG4gICAgdGhpcy5kb2N1bWVudHNCeUNvbXBvdW50S2V5SW5kZXhOYW1lID1cbiAgICAgIHRhYmxlcy5kb2N1bWVudHNCeUNvbXBvdW5kS2V5SW5kZXhOYW1lO1xuICAgIHRoaXMuZG9jdW1lbnRzQnlTdGF0dXNJbmRleE5hbWUgPSB0YWJsZXMuZG9jdW1lbnRzQnlTdGF0dXNJbmRleE5hbWU7XG4gICAgdGhpcy5maWxlSW1wb3J0V29ya2Zsb3cgPSBkYXRhSW1wb3J0LmZpbGVJbXBvcnRXb3JrZmxvdztcbiAgICB0aGlzLndlYnNpdGVDcmF3bGluZ1dvcmtmbG93ID0gZGF0YUltcG9ydC53ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdztcbiAgICB0aGlzLmRlbGV0ZVdvcmtzcGFjZVdvcmtmbG93ID0gd29ya3NwYWNlcy5kZWxldGVXb3Jrc3BhY2VXb3JrZmxvdztcbiAgICB0aGlzLmRhdGFJbXBvcnQgPSBkYXRhSW1wb3J0O1xuICB9XG59XG4iXX0=