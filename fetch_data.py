
import json
from collections import defaultdict
import os
import subprocess
import time
import hashlib
from datetime import datetime, timedelta

from stravalib import Client
from dotenv import load_dotenv, set_key, find_dotenv

MORDOR_CUTOFF_HASH = "65fd5fdf86b05ec22a6641ba0509b931"

TOKEN = "token.json"
ACTIVITIES = "activities.json"
TOTALS = "totals.json"

def get_token():
    keys = json.loads(os.environ['TOKEN'])
    if time.time() > keys['token']['expires_at']:
        print("Refreshing token")
        keys['token'] = Client().refresh_access_token(keys['clientId'], keys['clientSecret'], keys['token']['refresh_token'])
        set_env("TOKEN", keys)
    else:
        print("No need to refresh token.")
    return keys['token']

def set_env(key, value):
    os.environ[key] = json.dumps(value)
    set_key(find_dotenv(), key, os.environ[key])

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
    res = {}
    for a in activities:
        name = a["firstname"]
        if name not in res:
            res[name] = { "mi": 0, "recent1": 0, "recent3": 0, "recent7": 0 }
        res[name]["mi"] += a["mi"]
        if datetime.fromisoformat(a["time"]) > datetime.utcnow() - timedelta(days=1):
            res[name]["recent1"] += a["mi"]
        if datetime.fromisoformat(a["time"]) > datetime.utcnow() - timedelta(days=3):
            res[name]["recent3"] += a["mi"]
        if datetime.fromisoformat(a["time"]) > datetime.utcnow() - timedelta(days=7):
            res[name]["recent7"] += a["mi"]
    return res

def get_activities(client):
    activities = list(map(lambda a: extract_activity(a), client.get_club_activities(1203775)))

def ahash(a):
    vals = [a['name'], a['firstname'], a['lastname'], a['mi'], a['elapsed_time_s']]
    return hashlib.md5("|".join(map(lambda v: str(v), vals)).encode("UTF-8")).hexdigest()

def merge_activities(activities, new_activities):
    hashes = list(map(lambda a: ahash(a), activities))
    for activity in new_activities:
        id = ahash(activity)
        if id == MORDOR_CUTOFF_HASH:
            break
        
        if id in hashes:
            hashes.remove(id)
        else:
            activity['id'] = id
            activity['time'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')     
            activities.insert(0, activity)
            
    if len(hashes) != 0:
        print("Detected missing activities with hashes: " + str(hashes))
    return activities

def write_totals(activities):
    num_activities = len(activities)
    totals = total_activities(activities)
    totals["_meta"] = {'num_activities': num_activities, 'time': datetime.utcnow().isoformat()}
    print(f"found {num_activities} activities")
    write_file(TOTALS, totals)
    
    
load_dotenv()
token = get_token()
client = Client(access_token=token['access_token'])

activities = read_file(ACTIVITIES)
activities_new = get_activities(client);

print(str(len(activities)) + " " + str(len(activities_new)))
activities = merge_activities(activities, activities_new)
print(len(activities))
write_file(ACTIVITIES, activities)
write_totals(activities)