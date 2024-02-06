from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from sqlalchemy.exc import OperationalError
import secrets
import numpy as np
import io
from langchain_community.llms import OpenAI
from langchain_community.utilities import SQLDatabase
from langchain_experimental.sql import SQLDatabaseChain
from sqlalchemy import create_engine
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

mysql_connector = None
db_chain = None


@app.route('/', methods=['GET', 'POST'])
def index():
    if session.get('form_submitted'):
        return redirect(url_for('chat'))

    error_message = None
    global mysql_connector
    global db_chain

    if request.method == 'POST':
        try:
            host = request.form.get('host')
            port = int(request.form.get('port'))
            database = request.form.get('database')
            username = request.form.get('username')
            password = request.form.get('password')
            table = request.form.get('table')

            cs = f"mysql+pymysql://{username}:{password}@{host}/{database}"

            db_engine = create_engine(cs)
            db = SQLDatabase(db_engine)

            llm = OpenAI(temperature=0, verbose=True)

            db_chain = SQLDatabaseChain.from_llm(llm, db,
                                                 verbose=True,
                                                 use_query_checker=True)
            session['form_submitted'] = True

            return redirect(url_for('chat'))

        except OperationalError as e:
            error_message = f"Error connecting to MySQL: {e}"

    return render_template('connect.html', error_message=error_message)


@app.route('/chat', methods=['GET', 'POST'])
def chat():
    global mysql_connector

    if not session.get('form_submitted'):
        return redirect(url_for('index'))

    if request.method == 'POST':
        try:

            input_text = request.json.get('input_text', '')

            result = db_chain.run(input_text)
            print(result)

            if isinstance(result, str) or isinstance(result, int) or isinstance(result, float):
                return jsonify({'success': True, 'result': result, 'type': 'value'})
            elif isinstance(result, np.int64):
                return jsonify({'success': True, 'result': int(result), 'type': 'value'})
            else:
                num_rows = result.shape[0]
                if num_rows > 5:
                    csv_data_buffer = io.StringIO()
                    result.to_csv(csv_data_buffer)
                    csv_data = csv_data_buffer.getvalue()
                    return jsonify({'success': True, 'result': csv_data, 'type': 'csv'})
                else:
                    html_table = result.to_html(index=False)
                    return jsonify({'success': True, 'result': html_table, 'type': 'table'})

        except Exception as e:
            return jsonify({'success': False, 'error_message': str(e)})

    return render_template('index.html')


@app.route('/clear_session', methods=['POST'])
def clear_session():
    session.pop('form_submitted', None)
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True)
