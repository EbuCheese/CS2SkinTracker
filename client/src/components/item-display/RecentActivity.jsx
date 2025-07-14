import React from 'react';
import { Plus, DollarSign, Activity } from 'lucide-react';

const RecentActivity = ({ recentActivity, formatPrice }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        <div className="text-sm text-gray-400">
          Last {recentActivity.length} transactions
        </div>
      </div>
      
      <div className="space-y-4">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
            <div key={`${activity.type}-${activity.id || index}`} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors duration-200">
              <div className="flex items-center space-x-4">
                {/* Skin Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                  {activity.image_url ? (
                    <img 
                      src={activity.image_url} 
                      alt={activity.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full ${activity.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                    <span className="text-xs font-medium text-white">
                      {activity.title.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Activity Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'purchase' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {activity.type === 'purchase' ? (
                    <Plus className="w-5 h-5" />
                  ) : (
                    <DollarSign className="w-5 h-5" />
                  )}
                </div>

                {/* Activity Details */}
                <div>
                  <h3 className="font-medium text-white text-sm">{activity.title}</h3>
                  <p className="text-xs text-gray-400">{activity.subtitle}</p>
                  <p className="text-xs text-gray-500">
                    {activity.date && !isNaN(activity.date.getTime()) ? 
                      activity.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }) : 'Unknown date'
                    }
                  </p>
                </div>
              </div>
              
              {/* Amount */}
              <div className="text-right">
                <span className={`text-sm font-medium ${
                  activity.type === 'purchase' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {activity.type === 'purchase' ? '-' : '+'}{formatPrice(Math.abs(activity.amount))}
                </span>
                <p className="text-xs text-gray-400 capitalize">{activity.type}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;