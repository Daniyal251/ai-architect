import type { AgentProfile } from '../types.js';

interface Props {
  profile: AgentProfile;
  description: string;
}

export function AgentProfile({ profile, description }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl 
                        flex items-center justify-center text-4xl">
          {profile.avatar}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{profile.name}</h2>
          <p className="text-cyan-400">{profile.role}</p>
        </div>
      </div>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
