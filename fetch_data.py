
import json
from collections import defaultdict
import os
import subprocess
import time

from stravalib import Client
from dotenv import load_dotenv

TOKEN = "token.json"
ACTIVITIES = "activities.json"
TOTALS = "totals.json"

def get_token():
    #token = json.load(os.environ['TOKEN'])
    token = read_file(TOKEN)
    if time.time() > token['expires_at']:
        print("Refreshing token")
        token = Client().refresh_access_token(os.environ['CLIENT_ID'], os.environ['CLIENT_SECRET'], token['refresh_token'])
        print(token)
        write_file(TOKEN, token)
    else:
        print("No need to refresh token.")
    return token

def read_file(file):
    with open(file, 'r') as f:
        return json.load(f)
    
def write_file(file,obj):
    with open(file, 'w') as f:
        f.write(json.dumps(obj, indent=4))
        
def extract_activity(a):
    return {
        'name': a.name,
        'firstname': a.athlete.firstname,
        'lastname': a.athlete.lastname,
        'mi': a.distance.to("mi").num,
        'elapsed_time_s': a.elapsed_time.days * 86500 + a.elapsed_time.seconds
    }
    
def total_activities(activities):
    res = defaultdict(int)
    for a in activities:
        res[a["firstname"]] += a["mi"]
    
    return [{"name": name, "mi": mi} for name, mi in res.items()]
        
def update_activities(client):
    activities = list(map(lambda a: extract_activity(a), client.get_club_activities(1203775)))
    print(activities[-6])
    if activities[-6]['name'] != 'Mordor Cutoff':
        print('Unexpected data before 1/1')
    activities = activities[0:-6]
    num_activities = len(activities)
    write_file(ACTIVITIES, activities)
    totals = total_activities(activities)
    totals.append({'name': "activities", 'mi': num_activities})
    print(f"found {num_activities} activities")
    write_file(TOTALS, totals)

load_dotenv()
token = get_token()
client = Client(access_token=token['access_token'])
update_activities(client)