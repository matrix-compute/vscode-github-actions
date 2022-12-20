import {GitHubRepoContext} from "../git/repository";
import {logDebug} from "../log";
import * as model from "../model";
import {WorkflowJob} from "./WorkflowJob";

export class WorkflowRun {
  private _gitHubRepoContext: GitHubRepoContext;
  private _run: model.WorkflowRun;
  private _jobs: Promise<WorkflowJob[]> | undefined;

  constructor(gitHubRepoContext: GitHubRepoContext, run: model.WorkflowRun) {
    this._gitHubRepoContext = gitHubRepoContext;
    this._run = run;
  }

  get run(): model.WorkflowRun {
    return this._run;
  }

  updateRun(run: model.WorkflowRun) {
    if (this._run.updated_at !== run.updated_at) {
      // Run has changed, reset jobs. Note: this doesn't work in all cases, there might be race conditions
      // where the run update_at field isn't set but the jobs change, but in the vast majority of cases the
      // combined status/conclusion of the run is updated whenever a job changes, so this should be good enough
      // for now to reduce the # of API calls
      this._jobs = undefined;
    }

    this._run = run;
  }

  jobs(): Promise<WorkflowJob[]> {
    if (!this._jobs) {
      this._jobs = this.fetchJobs();
    }

    return this._jobs;
  }

  private async fetchJobs(): Promise<WorkflowJob[]> {
    logDebug("Getting workflow jobs");

    const result = await this._gitHubRepoContext.client.actions.listJobsForWorkflowRun({
      owner: this._gitHubRepoContext.owner,
      repo: this._gitHubRepoContext.name,
      run_id: this.run.id
    });

    const resp = result.data;
    const jobs: model.WorkflowJob[] = resp.jobs;
    return jobs.map(j => new WorkflowJob(this._gitHubRepoContext, j));
  }
}