import { connectDB } from '@shared/lib/db/mongoose';
import { Workspace } from '@shared/data/models';

export async function getWorkspacesForUser(userId) {
  await connectDB();
  let workspaces = await Workspace.find({ ownerId: userId }).lean();
  if (!workspaces.length) {
    const ws = await Workspace.create({ name: 'My Workspace', ownerId: userId });
    workspaces = [ws.toObject()];
  }
  return workspaces.map((w) => ({ ...w, _id: w._id.toString() }));
}
